-- ============================================================
-- Intent Cache + Semantic Dedup Layer
-- Выполнить на self-hosted: api.academyos.ru
-- Зависимость: extensions pgcrypto
--
-- Таблицы:
--   1. intent_cache           — кэш intent-классификаций по hash текста
--   2. semantic_clusters      — кластеры семантически похожих сообщений
--   3. canonical_messages     — каноничные представители кластеров
-- ============================================================

-- ==========================================
-- 1. Intent Cache (Hash Dedup)
-- ==========================================
-- Нормализованный текст → hash → кэшированный intent
-- Предотвращает повторные LLM-вызовы для одинаковых смыслов

CREATE TABLE IF NOT EXISTS public.intent_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Hash ключ
  normalized_text_hash TEXT NOT NULL,  -- md5 нормализованного текста
  normalized_text TEXT NOT NULL,       -- сам нормализованный текст (для отладки)
  original_text TEXT,                  -- исходный текст (первый попавшийся)
  -- Результат LLM
  intent TEXT NOT NULL,                -- classified intent
  stage TEXT,                          -- classified stage  
  confidence NUMERIC(3,2),             -- 0.00 - 1.00
  extra_data JSONB DEFAULT '{}',       -- доп. данные от LLM (sentiment, urgency, etc)
  -- Статистика
  hit_count INTEGER NOT NULL DEFAULT 1,  -- сколько раз этот hash встречался
  last_hit_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Метаданные
  model_used TEXT,                     -- какая модель классифицировала
  tokens_used INTEGER,                 -- сколько токенов потрачено
  processing_time_ms INTEGER,          -- время обработки
  --
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, normalized_text_hash)
);

CREATE INDEX IF NOT EXISTS idx_ic_org_hash ON public.intent_cache(organization_id, normalized_text_hash);
CREATE INDEX IF NOT EXISTS idx_ic_intent ON public.intent_cache(intent);
CREATE INDEX IF NOT EXISTS idx_ic_hits ON public.intent_cache(hit_count DESC);

ALTER TABLE public.intent_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access intent_cache" ON public.intent_cache;
CREATE POLICY "Service role full access intent_cache"
  ON public.intent_cache FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Org members can view intent_cache" ON public.intent_cache;
CREATE POLICY "Org members can view intent_cache"
  ON public.intent_cache FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- ==========================================
-- 2. Semantic Clusters
-- ==========================================
-- Группы семантически близких сообщений

CREATE TABLE IF NOT EXISTS public.semantic_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Кластер
  cluster_label TEXT,                  -- человекочитаемая метка (генерируется LLM)
  intent TEXT,                         -- доминантный intent кластера
  -- Каноничное сообщение
  canonical_text TEXT NOT NULL,        -- текст-представитель кластера
  canonical_embedding VECTOR(1536),    -- embedding канонического текста
  -- Метрики
  member_count INTEGER NOT NULL DEFAULT 1,
  avg_similarity NUMERIC(5,4),         -- средняя cosine similarity внутри кластера
  -- LLM результат (обработан 1 раз для всего кластера)
  llm_result JSONB DEFAULT '{}',       -- полный результат LLM-анализа
  --
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sc_org ON public.semantic_clusters(organization_id);
CREATE INDEX IF NOT EXISTS idx_sc_intent ON public.semantic_clusters(intent);

ALTER TABLE public.semantic_clusters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access semantic_clusters" ON public.semantic_clusters;
CREATE POLICY "Service role full access semantic_clusters"
  ON public.semantic_clusters FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Org members can view semantic_clusters" ON public.semantic_clusters;
CREATE POLICY "Org members can view semantic_clusters"
  ON public.semantic_clusters FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- ==========================================
-- 3. Cluster Members (связь сообщение → кластер)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.semantic_cluster_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.semantic_clusters(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  -- Связь с исходным сообщением
  message_text TEXT NOT NULL,
  message_hash TEXT NOT NULL,          -- md5 нормализованного текста
  similarity_score NUMERIC(5,4),       -- cosine similarity к canonical
  source_type TEXT DEFAULT 'chat',     -- 'chat', 'conversation_example', 'segment'
  source_id UUID,                      -- ID исходной записи
  --
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scm_cluster ON public.semantic_cluster_members(cluster_id);
CREATE INDEX IF NOT EXISTS idx_scm_hash ON public.semantic_cluster_members(message_hash);

ALTER TABLE public.semantic_cluster_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access cluster_members" ON public.semantic_cluster_members;
CREATE POLICY "Service role full access cluster_members"
  ON public.semantic_cluster_members FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- 4. Helper functions
-- ==========================================

-- Normalize text for hashing: lowercase, strip punctuation/emoji, trim
CREATE OR REPLACE FUNCTION public.normalize_text_for_hash(p_text TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT trim(regexp_replace(
    regexp_replace(
      lower(COALESCE(p_text, '')),
      '[^\u0400-\u04FFa-z0-9\s]', '', 'g'  -- оставляем кириллицу, латиницу, цифры, пробелы
    ),
    '\s+', ' ', 'g'  -- нормализуем пробелы
  ));
$$;

-- Hash normalized text
CREATE OR REPLACE FUNCTION public.hash_text(p_text TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT md5(public.normalize_text_for_hash(p_text));
$$;

-- Lookup intent from cache (returns NULL if not found)
CREATE OR REPLACE FUNCTION public.lookup_intent_cache(
  p_organization_id UUID,
  p_text TEXT
)
RETURNS TABLE (
  intent TEXT,
  stage TEXT,
  confidence NUMERIC,
  extra_data JSONB,
  cache_hit BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_hash TEXT;
  v_result RECORD;
BEGIN
  v_hash := public.hash_text(p_text);
  
  SELECT ic.intent, ic.stage, ic.confidence, ic.extra_data
  INTO v_result
  FROM public.intent_cache ic
  WHERE ic.organization_id = p_organization_id
    AND ic.normalized_text_hash = v_hash;
  
  IF FOUND THEN
    -- Update hit count
    UPDATE public.intent_cache
    SET hit_count = hit_count + 1,
        last_hit_at = now()
    WHERE organization_id = p_organization_id
      AND normalized_text_hash = v_hash;
    
    RETURN QUERY SELECT v_result.intent, v_result.stage, v_result.confidence, v_result.extra_data, true;
  ELSE
    RETURN QUERY SELECT NULL::TEXT, NULL::TEXT, NULL::NUMERIC, NULL::JSONB, false;
  END IF;
END;
$$;

-- Insert or update intent cache
CREATE OR REPLACE FUNCTION public.upsert_intent_cache(
  p_organization_id UUID,
  p_text TEXT,
  p_intent TEXT,
  p_stage TEXT DEFAULT NULL,
  p_confidence NUMERIC DEFAULT NULL,
  p_extra_data JSONB DEFAULT '{}',
  p_model TEXT DEFAULT NULL,
  p_tokens INTEGER DEFAULT NULL,
  p_time_ms INTEGER DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_hash TEXT;
  v_normalized TEXT;
  v_id UUID;
BEGIN
  v_normalized := public.normalize_text_for_hash(p_text);
  v_hash := md5(v_normalized);
  
  INSERT INTO public.intent_cache (
    organization_id, normalized_text_hash, normalized_text, original_text,
    intent, stage, confidence, extra_data,
    model_used, tokens_used, processing_time_ms
  ) VALUES (
    p_organization_id, v_hash, v_normalized, p_text,
    p_intent, p_stage, p_confidence, p_extra_data,
    p_model, p_tokens, p_time_ms
  )
  ON CONFLICT (organization_id, normalized_text_hash) DO UPDATE SET
    hit_count = intent_cache.hit_count + 1,
    last_hit_at = now()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Stats: cache effectiveness
CREATE OR REPLACE FUNCTION public.get_intent_cache_stats(p_organization_id UUID)
RETURNS TABLE (
  total_entries BIGINT,
  total_hits BIGINT,
  avg_hits_per_entry NUMERIC,
  top_intents JSONB,
  estimated_savings_pct NUMERIC
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT
    count(*),
    sum(hit_count),
    round(avg(hit_count)::NUMERIC, 1),
    (SELECT jsonb_agg(row_to_json(t)) FROM (
      SELECT intent, count(*) as cnt
      FROM intent_cache
      WHERE organization_id = p_organization_id
      GROUP BY intent ORDER BY cnt DESC LIMIT 10
    ) t),
    CASE WHEN sum(hit_count) > 0
      THEN round((1 - count(*)::NUMERIC / sum(hit_count)) * 100, 1)
      ELSE 0
    END
  FROM public.intent_cache
  WHERE organization_id = p_organization_id;
$$;

COMMENT ON TABLE public.intent_cache IS
  'Кэш intent-классификаций: normalized_text → hash → LLM result. Предотвращает повторные вызовы для одинаковых смыслов.';

COMMENT ON TABLE public.semantic_clusters IS
  'Семантические кластеры похожих сообщений. LLM вызывается 1 раз на кластер, результат распространяется на всех участников.';

COMMENT ON TABLE public.semantic_cluster_members IS
  'Связь сообщений с семантическими кластерами. Каждое сообщение может принадлежать одному кластеру.';
