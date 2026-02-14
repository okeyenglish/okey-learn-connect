-- ============================================================
-- EVENT-DRIVEN PIPELINE: Enqueue + Priority + Retry
-- Extends processing_jobs from layered_knowledge_schema
-- ============================================================

-- Add missing columns to processing_jobs (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'processing_jobs' AND column_name = 'priority') THEN
    ALTER TABLE public.processing_jobs ADD COLUMN priority INTEGER DEFAULT 50;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'processing_jobs' AND column_name = 'attempts') THEN
    ALTER TABLE public.processing_jobs ADD COLUMN attempts INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'processing_jobs' AND column_name = 'max_attempts') THEN
    ALTER TABLE public.processing_jobs ADD COLUMN max_attempts INTEGER DEFAULT 5;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'processing_jobs' AND column_name = 'run_after') THEN
    ALTER TABLE public.processing_jobs ADD COLUMN run_after TIMESTAMPTZ DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'processing_jobs' AND column_name = 'payload') THEN
    ALTER TABLE public.processing_jobs ADD COLUMN payload JSONB DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'processing_jobs' AND column_name = 'worker_id') THEN
    ALTER TABLE public.processing_jobs ADD COLUMN worker_id TEXT;
  END IF;
END $$;

-- Better index for worker polling
CREATE INDEX IF NOT EXISTS idx_jobs_worker_poll
  ON public.processing_jobs(status, run_after, priority DESC)
  WHERE status IN ('pending', 'retry');

-- ============================================================
-- Rate limit tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS public.api_usage_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL, -- 'lovable' | 'openai'
  window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', now()),
  tokens_used INTEGER DEFAULT 0,
  requests_count INTEGER DEFAULT 0,
  UNIQUE(provider, window_start)
);

ALTER TABLE public.api_usage_windows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access to api_usage_windows"
  ON public.api_usage_windows FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Enqueue function (fast — ≤5ms)
-- ============================================================
CREATE OR REPLACE FUNCTION public.enqueue_ai_job(
  p_organization_id UUID,
  p_job_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_priority INTEGER DEFAULT 50,
  p_payload JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  v_job_id UUID;
BEGIN
  INSERT INTO public.processing_jobs (
    organization_id, job_type, entity_type, entity_id,
    priority, status, payload, run_after
  ) VALUES (
    p_organization_id, p_job_type, p_entity_type, p_entity_id,
    p_priority, 'pending', p_payload, now()
  )
  RETURNING id INTO v_job_id;
  
  RETURN v_job_id;
END;
$$;

-- ============================================================
-- Claim jobs (FOR UPDATE SKIP LOCKED — concurrent workers safe)
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_processing_jobs(
  p_job_types TEXT[],
  p_limit INTEGER DEFAULT 20,
  p_worker_id TEXT DEFAULT 'default'
)
RETURNS SETOF public.processing_jobs
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.processing_jobs
  SET 
    status = 'processing',
    started_at = now(),
    attempts = attempts + 1,
    worker_id = p_worker_id
  WHERE id IN (
    SELECT id FROM public.processing_jobs
    WHERE status IN ('pending', 'retry')
      AND job_type = ANY(p_job_types)
      AND run_after <= now()
    ORDER BY priority DESC, created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

-- ============================================================
-- Complete job
-- ============================================================
CREATE OR REPLACE FUNCTION public.complete_job(
  p_job_id UUID,
  p_status TEXT DEFAULT 'completed',
  p_error TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF p_status = 'failed' THEN
    UPDATE public.processing_jobs
    SET 
      status = CASE 
        WHEN attempts < max_attempts THEN 'retry' 
        ELSE 'failed' 
      END,
      error_message = p_error,
      -- Exponential backoff: 2m, 5m, 15m, 1h, 4h
      run_after = CASE 
        WHEN attempts < max_attempts THEN 
          now() + (power(3, attempts) * interval '1 minute')
        ELSE NULL 
      END,
      completed_at = CASE WHEN attempts >= max_attempts THEN now() ELSE NULL END
    WHERE id = p_job_id;
  ELSE
    UPDATE public.processing_jobs
    SET status = 'completed', completed_at = now(), error_message = NULL
    WHERE id = p_job_id;
  END IF;
END;
$$;

-- ============================================================
-- Auto-enqueue trigger on new chat_messages
-- ============================================================
CREATE OR REPLACE FUNCTION public.enqueue_message_processing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only process incoming client messages
  IF NEW.direction = 'incoming' AND NEW.client_id IS NOT NULL THEN
    -- Priority 80 for new realtime messages
    PERFORM public.enqueue_ai_job(
      NEW.organization_id,
      'normalize_message',
      'message',
      NEW.id,
      80,
      jsonb_build_object('client_id', NEW.client_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger (idempotent)
DROP TRIGGER IF EXISTS trg_enqueue_message_processing ON public.chat_messages;
CREATE TRIGGER trg_enqueue_message_processing
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_message_processing();

-- ============================================================
-- Pipeline stats view
-- ============================================================
CREATE OR REPLACE VIEW public.pipeline_stats AS
SELECT
  job_type,
  status,
  count(*) as job_count,
  avg(EXTRACT(EPOCH FROM (completed_at - started_at)))::numeric(10,2) as avg_duration_sec,
  max(created_at) as last_created
FROM public.processing_jobs
GROUP BY job_type, status;
