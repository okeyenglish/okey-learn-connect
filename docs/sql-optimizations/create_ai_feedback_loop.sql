-- ============================================================
-- AI FEEDBACK LOOP: Events + Metrics + Self-Learning
-- Single event log table — no migrations needed for new metrics
-- ============================================================

-- ============================================================
-- Core event log (единый лог всех AI-событий)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  event_type TEXT NOT NULL,
    -- suggestion_shown | suggestion_accepted | suggestion_edited
    -- suggestion_ignored | stage_transition | health_change
    -- rag_hit_used | rag_hit_rejected | silent_failure
    -- response_latency | ai_error
  conversation_id UUID,
  client_id UUID,
  user_id UUID,        -- manager who interacted
  suggestion_id UUID,  -- links to ai_annotations if applicable
  payload JSONB DEFAULT '{}',
    -- flexible: edit_distance, from_stage, to_stage, health_before, health_after, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_events_type ON public.ai_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_events_org ON public.ai_events(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_events_conv ON public.ai_events(conversation_id) WHERE conversation_id IS NOT NULL;

ALTER TABLE public.ai_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view AI events in their org"
  ON public.ai_events FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can insert AI events in their org"
  ON public.ai_events FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Service role full access to ai_events"
  ON public.ai_events FOR ALL
  USING (true) WITH CHECK (true);

-- ============================================================
-- Aggregated metrics view (dashboard-ready)
-- ============================================================
CREATE OR REPLACE VIEW public.ai_feedback_metrics AS
WITH recent AS (
  SELECT * FROM public.ai_events
  WHERE created_at > now() - interval '30 days'
)
SELECT
  organization_id,

  -- 1. Acceptance Rate
  count(*) FILTER (WHERE event_type = 'suggestion_accepted')::float /
    NULLIF(count(*) FILTER (WHERE event_type = 'suggestion_shown'), 0)
    AS acceptance_rate,

  -- 2. Average Edit Distance
  avg((payload->>'edit_distance')::float)
    FILTER (WHERE event_type = 'suggestion_edited')
    AS avg_edit_distance,

  -- 3. Stage Transitions triggered by AI
  count(*) FILTER (WHERE event_type = 'stage_transition' AND (payload->>'triggered_by_ai')::boolean = true)
    AS ai_stage_transitions,

  -- 4. Health Recovery Rate
  count(*) FILTER (WHERE event_type = 'health_change' AND (payload->>'recovered')::boolean = true)::float /
    NULLIF(count(*) FILTER (WHERE event_type = 'health_change'), 0)
    AS health_recovery_rate,

  -- 5. RAG Hit Quality
  count(*) FILTER (WHERE event_type = 'rag_hit_used')::float /
    NULLIF(count(*) FILTER (WHERE event_type IN ('rag_hit_used', 'rag_hit_rejected')), 0)
    AS rag_quality_rate,

  -- 6. Avg client response time after AI suggestion (seconds)
  avg((payload->>'response_seconds')::float)
    FILTER (WHERE event_type = 'response_latency')
    AS avg_response_latency_sec,

  -- 7. Silent Failure Rate
  count(*) FILTER (WHERE event_type = 'silent_failure')::float /
    NULLIF(count(*) FILTER (WHERE event_type = 'suggestion_shown'), 0)
    AS silent_failure_rate,

  -- Totals
  count(*) FILTER (WHERE event_type = 'suggestion_shown') AS total_shown,
  count(*) FILTER (WHERE event_type = 'suggestion_accepted') AS total_accepted,
  count(*) FILTER (WHERE event_type = 'suggestion_edited') AS total_edited,
  count(*) FILTER (WHERE event_type = 'suggestion_ignored') AS total_ignored,
  count(*) AS total_events

FROM recent
GROUP BY organization_id;

-- ============================================================
-- Helper: log AI event (fast, for edge functions)
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_ai_event(
  p_org_id UUID,
  p_event_type TEXT,
  p_conversation_id UUID DEFAULT NULL,
  p_client_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_suggestion_id UUID DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.ai_events (
    organization_id, event_type, conversation_id,
    client_id, user_id, suggestion_id, payload
  ) VALUES (
    p_org_id, p_event_type, p_conversation_id,
    p_client_id, p_user_id, p_suggestion_id, p_payload
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ============================================================
-- Auto-scoring: compute example quality from feedback
-- ============================================================
CREATE OR REPLACE FUNCTION public.compute_example_score(p_suggestion_id UUID)
RETURNS FLOAT
LANGUAGE sql STABLE
SET search_path = 'public'
AS $$
  SELECT
    CASE
      WHEN bool_or(event_type = 'suggestion_accepted') THEN 1.0
      WHEN bool_or(event_type = 'suggestion_edited') THEN
        1.0 - COALESCE(avg((payload->>'edit_distance')::float) FILTER (WHERE event_type = 'suggestion_edited'), 0.5)
      WHEN bool_or(event_type = 'suggestion_ignored') THEN 0.1
      WHEN bool_or(event_type = 'silent_failure') THEN 0.0
      ELSE 0.5
    END
  FROM public.ai_events
  WHERE suggestion_id = p_suggestion_id;
$$;
