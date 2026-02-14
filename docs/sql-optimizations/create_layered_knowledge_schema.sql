-- ============================================================
-- LAYERED KNOWLEDGE SCHEMA
-- 5-level architecture for AI-CRM that scales ×100 without reindexing
-- ============================================================

-- Enable pgvector if not already (in extensions schema for self-hosted)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ============================================================
-- 🟢 LAYER 1: RAW (immutable source of truth)
-- ============================================================
-- We already have chat_messages as raw layer.
-- No changes needed — it's our sacred immutable data.

-- ============================================================
-- 🟡 LAYER 2: NORMALIZED TEXT
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages_normalized (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  normalized_text TEXT NOT NULL,
  text_hash TEXT NOT NULL,
  language TEXT DEFAULT 'ru',
  tokens_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_normalized_hash ON public.messages_normalized(text_hash);
CREATE INDEX IF NOT EXISTS idx_messages_normalized_message ON public.messages_normalized(message_id);

ALTER TABLE public.messages_normalized ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to messages_normalized"
  ON public.messages_normalized FOR ALL
  USING (true) WITH CHECK (true);

-- ============================================================
-- 🔵 LAYER 3: SEMANTIC UNITS (the real learning entities)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.semantic_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  conversation_id UUID REFERENCES public.clients(id),
  start_message_id UUID REFERENCES public.chat_messages(id),
  end_message_id UUID REFERENCES public.chat_messages(id),
  unit_type TEXT NOT NULL DEFAULT 'qa_pair',
    -- qa_pair | objection_handling | greeting | closing | escalation
  client_text TEXT,
  manager_reply TEXT,
  context_before TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_semantic_units_org ON public.semantic_units(organization_id);
CREATE INDEX IF NOT EXISTS idx_semantic_units_type ON public.semantic_units(unit_type);
CREATE INDEX IF NOT EXISTS idx_semantic_units_conv ON public.semantic_units(conversation_id);

ALTER TABLE public.semantic_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view semantic units in their org"
  ON public.semantic_units FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Service role full access to semantic_units"
  ON public.semantic_units FOR ALL
  USING (true) WITH CHECK (true);

-- ============================================================
-- 🟣 LAYER 4: EMBEDDING REGISTRY (multi-model, versionable)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.embeddings_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
    -- semantic_unit | faq | script | normalized_message
  entity_id UUID NOT NULL,
  model_name TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  embedding extensions.vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Composite index for multi-model support
CREATE INDEX IF NOT EXISTS idx_embeddings_entity
  ON public.embeddings_registry(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_model
  ON public.embeddings_registry(entity_type, model_name);

-- Vector similarity search index
-- NOTE: ivfflat index requires data in the table first (at least 100 rows).
-- Run this AFTER inserting initial embeddings:
-- CREATE INDEX IF NOT EXISTS idx_embeddings_vector
--   ON public.embeddings_registry
--   USING ivfflat (embedding extensions.vector_cosine_ops)
--   WITH (lists = 100);

-- For now, use hnsw which works on empty tables:
CREATE INDEX IF NOT EXISTS idx_embeddings_vector
  ON public.embeddings_registry
  USING hnsw (embedding extensions.vector_cosine_ops);

ALTER TABLE public.embeddings_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to embeddings_registry"
  ON public.embeddings_registry FOR ALL
  USING (true) WITH CHECK (true);

-- ============================================================
-- 🔴 LAYER 5: AI ANNOTATIONS (versioned AI interpretations)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  entity_type TEXT NOT NULL,
    -- semantic_unit | conversation | client
  entity_id UUID NOT NULL,
  annotation_type TEXT NOT NULL,
    -- intent | stage | persona | sentiment | quality_score | next_action
  version INTEGER NOT NULL DEFAULT 1,
  value_json JSONB NOT NULL DEFAULT '{}',
  confidence FLOAT,
  model_used TEXT,
  prompt_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_annotations_entity
  ON public.ai_annotations(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_annotations_type
  ON public.ai_annotations(annotation_type, version);
CREATE INDEX IF NOT EXISTS idx_annotations_org
  ON public.ai_annotations(organization_id);

-- Unique: one annotation per entity+type+version
CREATE UNIQUE INDEX IF NOT EXISTS idx_annotations_unique
  ON public.ai_annotations(entity_type, entity_id, annotation_type, version);

ALTER TABLE public.ai_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view annotations in their org"
  ON public.ai_annotations FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Service role full access to ai_annotations"
  ON public.ai_annotations FOR ALL
  USING (true) WITH CHECK (true);

-- ============================================================
-- ⚙️ PROCESSING JOBS (partial reprocessing + background evolution)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  job_type TEXT NOT NULL,
    -- normalize | embed | annotate | cluster | re_annotate
  status TEXT NOT NULL DEFAULT 'pending',
    -- pending | processing | completed | failed | skipped
  version INTEGER DEFAULT 1,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.processing_jobs(status, job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_entity ON public.processing_jobs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_jobs_org ON public.processing_jobs(organization_id);

ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to processing_jobs"
  ON public.processing_jobs FOR ALL
  USING (true) WITH CHECK (true);

-- ============================================================
-- 🔧 HELPER FUNCTIONS
-- ============================================================

-- Semantic search across embedding registry
DROP FUNCTION IF EXISTS public.match_embeddings;
CREATE OR REPLACE FUNCTION public.match_embeddings(
  query_embedding extensions.vector(1536),
  p_entity_type TEXT,
  p_model_name TEXT DEFAULT 'text-embedding-3-small',
  match_threshold FLOAT DEFAULT 0.78,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  entity_id UUID,
  entity_type TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE
SET search_path TO 'public', 'extensions'
AS $$
  SELECT
    e.id,
    e.entity_id,
    e.entity_type,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM public.embeddings_registry e
  WHERE e.entity_type = p_entity_type
    AND e.model_name = p_model_name
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Get latest annotation version for an entity
CREATE OR REPLACE FUNCTION public.get_latest_annotation(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_annotation_type TEXT
)
RETURNS JSONB
LANGUAGE sql STABLE
SET search_path = 'public'
AS $$
  SELECT value_json
  FROM public.ai_annotations
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
    AND annotation_type = p_annotation_type
  ORDER BY version DESC
  LIMIT 1;
$$;

-- Normalize text for hashing (reusable)
CREATE OR REPLACE FUNCTION public.normalize_text(input_text TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
SET search_path = 'public'
AS $$
  SELECT lower(
    regexp_replace(
      regexp_replace(
        trim(input_text),
        '[^\w\s]', '', 'g'
      ),
      '\s+', ' ', 'g'
    )
  );
$$;

-- ============================================================
-- 📊 STATS VIEW
-- ============================================================
CREATE OR REPLACE VIEW public.knowledge_layer_stats AS
SELECT
  'messages_normalized' AS layer,
  (SELECT count(*) FROM public.messages_normalized) AS row_count
UNION ALL
SELECT
  'semantic_units',
  (SELECT count(*) FROM public.semantic_units)
UNION ALL
SELECT
  'embeddings_registry',
  (SELECT count(*) FROM public.embeddings_registry)
UNION ALL
SELECT
  'ai_annotations',
  (SELECT count(*) FROM public.ai_annotations)
UNION ALL
SELECT
  'processing_jobs',
  (SELECT count(*) FROM public.processing_jobs);
