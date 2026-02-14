-- ============================================================
-- Self-Improving AI Learning System Migration
-- Run on self-hosted Supabase
-- ============================================================

-- 1. Add dynamic scoring fields to conversation_examples
ALTER TABLE public.conversation_examples
  ADD COLUMN IF NOT EXISTS usage_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS feedback_score float DEFAULT 0,
  ADD COLUMN IF NOT EXISTS success_rate float DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS memory_tier text DEFAULT 'archive' CHECK (memory_tier IN ('working', 'longterm', 'archive')),
  ADD COLUMN IF NOT EXISTS final_score float DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freshness_score float DEFAULT 1.0;

-- 2. Create conversation_segments table for granular retrieval
CREATE TABLE IF NOT EXISTS public.conversation_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_example_id uuid REFERENCES public.conversation_examples(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  intent_type text, -- price_check, schedule_info, objection_handling, etc.
  client_text text NOT NULL,
  manager_reply text NOT NULL,
  embedding vector(1536),
  quality_score float DEFAULT 0,
  usage_count integer DEFAULT 0,
  feedback_score float DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_segments_org ON public.conversation_segments(organization_id);
CREATE INDEX IF NOT EXISTS idx_segments_intent ON public.conversation_segments(intent_type);
CREATE INDEX IF NOT EXISTS idx_segments_conv ON public.conversation_segments(conversation_example_id);

-- 3. Create edited_examples table for learning from edits
CREATE TABLE IF NOT EXISTS public.edited_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  client_id uuid,
  original_ai_response text NOT NULL,
  edited_response text NOT NULL,
  client_message text,
  conversation_context text,
  embedding vector(1536),
  quality_boost float DEFAULT 1.0, -- edited examples are high quality
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edited_org ON public.edited_examples(organization_id);

-- 4. Add RPC for matching segments (vector search)
CREATE OR REPLACE FUNCTION public.match_segments(
  query_embedding vector(1536),
  p_organization_id uuid DEFAULT NULL,
  p_intent_type text DEFAULT NULL,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  conversation_example_id uuid,
  intent_type text,
  client_text text,
  manager_reply text,
  quality_score float,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.id,
    cs.conversation_example_id,
    cs.intent_type,
    cs.client_text,
    cs.manager_reply,
    cs.quality_score,
    1 - (cs.embedding <=> query_embedding) AS similarity
  FROM public.conversation_segments cs
  WHERE (p_organization_id IS NULL OR cs.organization_id = p_organization_id)
    AND (p_intent_type IS NULL OR cs.intent_type = p_intent_type)
    AND cs.embedding IS NOT NULL
  ORDER BY cs.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. Add RPC for matching edited examples
CREATE OR REPLACE FUNCTION public.match_edited_examples(
  query_embedding vector(1536),
  p_organization_id uuid DEFAULT NULL,
  match_count int DEFAULT 3
)
RETURNS TABLE (
  id uuid,
  original_ai_response text,
  edited_response text,
  client_message text,
  quality_boost float,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ee.id,
    ee.original_ai_response,
    ee.edited_response,
    ee.client_message,
    ee.quality_boost,
    1 - (ee.embedding <=> query_embedding) AS similarity
  FROM public.edited_examples ee
  WHERE (p_organization_id IS NULL OR ee.organization_id = p_organization_id)
    AND ee.embedding IS NOT NULL
  ORDER BY ee.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 6. Function to refresh working memory nightly
CREATE OR REPLACE FUNCTION public.refresh_working_memory(p_organization_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Apply freshness decay (0.98 per week = ~0.997 per day)
  UPDATE public.conversation_examples
  SET freshness_score = GREATEST(0.1, freshness_score * 0.997)
  WHERE (p_organization_id IS NULL OR organization_id = p_organization_id);

  -- Recalculate final_score
  UPDATE public.conversation_examples
  SET final_score = (
    0.25 * COALESCE(feedback_score, 0) +
    0.20 * COALESCE(success_rate, 0) +
    0.15 * LEAST(COALESCE(usage_count, 0)::float / 20.0, 1.0) +
    0.15 * COALESCE(freshness_score, 1.0) +
    0.25 * COALESCE(quality_score, 0)::float / 5.0
  )
  WHERE (p_organization_id IS NULL OR organization_id = p_organization_id);

  -- Demote all to archive first
  UPDATE public.conversation_examples
  SET memory_tier = 'archive'
  WHERE (p_organization_id IS NULL OR organization_id = p_organization_id);

  -- Promote top examples to longterm (approved + quality >= 3)
  UPDATE public.conversation_examples
  SET memory_tier = 'longterm'
  WHERE approved = true
    AND quality_score >= 3
    AND (p_organization_id IS NULL OR organization_id = p_organization_id);

  -- Promote top 400 to working memory
  UPDATE public.conversation_examples
  SET memory_tier = 'working'
  WHERE id IN (
    SELECT id FROM public.conversation_examples
    WHERE approved = true
      AND quality_score >= 4
      AND final_score > 0.3
      AND (p_organization_id IS NULL OR organization_id = p_organization_id)
    ORDER BY final_score DESC
    LIMIT 400
  );
END;
$$;

-- 7. Function to increment usage count when example is used in RAG
CREATE OR REPLACE FUNCTION public.track_example_usage(p_example_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.conversation_examples
  SET usage_count = COALESCE(usage_count, 0) + 1,
      last_used_at = now()
  WHERE id = p_example_id;
END;
$$;

-- 8. Initial score calculation for existing data
UPDATE public.conversation_examples
SET 
  memory_tier = CASE 
    WHEN approved = true AND quality_score >= 4 THEN 'working'
    WHEN approved = true AND quality_score >= 3 THEN 'longterm'
    ELSE 'archive'
  END,
  freshness_score = GREATEST(0.1, EXP(-EXTRACT(EPOCH FROM (now() - created_at)) / (90 * 86400))),
  final_score = COALESCE(quality_score, 0)::float / 5.0 * 0.5 + 
                GREATEST(0.1, EXP(-EXTRACT(EPOCH FROM (now() - created_at)) / (90 * 86400))) * 0.5
WHERE memory_tier IS NULL OR memory_tier = 'archive';
