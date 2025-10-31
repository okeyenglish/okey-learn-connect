-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Apps table
CREATE TABLE IF NOT EXISTS apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('game', 'quiz', 'exercise', 'flashcards', 'other')),
  level TEXT NOT NULL CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'mixed')),
  description TEXT,
  author_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  tags TEXT[] DEFAULT '{}',
  latest_version INTEGER DEFAULT 1,
  install_count INTEGER DEFAULT 0,
  avg_rating NUMERIC(3,2) DEFAULT 0,
  embedding vector(1536),
  fingerprint TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_apps_author ON apps(author_id);
CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status);
CREATE INDEX IF NOT EXISTS idx_apps_kind ON apps(kind);
CREATE INDEX IF NOT EXISTS idx_apps_level ON apps(level);

-- App versions
CREATE TABLE IF NOT EXISTS app_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  prompt JSONB NOT NULL,
  model TEXT NOT NULL,
  artifact_path TEXT NOT NULL,
  preview_url TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(app_id, version)
);
CREATE INDEX IF NOT EXISTS idx_app_versions_app ON app_versions(app_id);

-- Installs
CREATE TABLE IF NOT EXISTS app_installs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL,
  installed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(app_id, teacher_id)
);
CREATE INDEX IF NOT EXISTS idx_app_installs_teacher ON app_installs(teacher_id);

-- Reviews
CREATE TABLE IF NOT EXISTS app_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(app_id, teacher_id)
);
CREATE INDEX IF NOT EXISTS idx_app_reviews_app ON app_reviews(app_id);

-- Usage
CREATE TABLE IF NOT EXISTS app_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL,
  used_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_app_usage_app ON app_usage(app_id);
CREATE INDEX IF NOT EXISTS idx_app_usage_teacher ON app_usage(teacher_id);

-- Flags
CREATE TABLE IF NOT EXISTS app_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_app_flags_status ON app_flags(status);

-- Functions & triggers
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION app_fingerprint(
  p_kind TEXT, p_level TEXT, p_description TEXT
) RETURNS TEXT AS $$
BEGIN
  RETURN md5(p_kind || ':' || p_level || ':' || COALESCE(p_description, ''));
END; $$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION set_app_fingerprint()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fingerprint = app_fingerprint(NEW.kind, NEW.level, NEW.description);
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION similar_apps(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.8,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id UUID, title TEXT, kind TEXT, level TEXT, description TEXT, similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.title, a.kind, a.level, a.description,
         1 - (a.embedding <=> query_embedding) AS similarity
    FROM apps a
   WHERE a.status = 'published'
     AND a.embedding IS NOT NULL
     AND 1 - (a.embedding <=> query_embedding) > match_threshold
   ORDER BY a.embedding <=> query_embedding
   LIMIT match_count;
END; $$ LANGUAGE plpgsql;

-- Catalog view
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'catalog'
  ) THEN
    EXECUTE $v$
    CREATE VIEW catalog AS
    SELECT a.id, a.title, a.kind, a.level, a.description, a.author_id,
           a.tags, a.latest_version, a.install_count, a.avg_rating, a.created_at,
           av.preview_url, av.meta
      FROM apps a
      JOIN app_versions av ON a.id = av.app_id AND a.latest_version = av.version
     WHERE a.status = 'published';
    $v$;
  END IF;
END$$;

-- Triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'apps_updated_at') THEN
    CREATE TRIGGER apps_updated_at BEFORE UPDATE ON apps
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'apps_set_fingerprint') THEN
    CREATE TRIGGER apps_set_fingerprint BEFORE INSERT OR UPDATE ON apps
      FOR EACH ROW EXECUTE FUNCTION set_app_fingerprint();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'app_reviews_updated_at') THEN
    CREATE TRIGGER app_reviews_updated_at BEFORE UPDATE ON app_reviews
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END$$;

-- RLS
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_installs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_flags ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- apps policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='apps' AND policyname='Authors can manage their apps'
  ) THEN
    CREATE POLICY "Authors can manage their apps" ON apps FOR ALL USING (author_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='apps' AND policyname='Published apps are viewable by all'
  ) THEN
    CREATE POLICY "Published apps are viewable by all" ON apps FOR SELECT USING (status = 'published');
  END IF;

  -- app_versions policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='app_versions' AND policyname='Authors can manage versions'
  ) THEN
    CREATE POLICY "Authors can manage versions" ON app_versions
      FOR ALL USING (app_id IN (SELECT id FROM apps WHERE author_id = auth.uid()));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='app_versions' AND policyname='Published versions are viewable'
  ) THEN
    CREATE POLICY "Published versions are viewable" ON app_versions
      FOR SELECT USING (app_id IN (SELECT id FROM apps WHERE status = 'published'));
  END IF;

  -- app_installs policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='app_installs' AND policyname='Teachers can manage their installs'
  ) THEN
    CREATE POLICY "Teachers can manage their installs" ON app_installs FOR ALL USING (teacher_id = auth.uid());
  END IF;

  -- app_reviews policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='app_reviews' AND policyname='Teachers can manage their reviews'
  ) THEN
    CREATE POLICY "Teachers can manage their reviews" ON app_reviews FOR ALL USING (teacher_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='app_reviews' AND policyname='Reviews are viewable by all'
  ) THEN
    CREATE POLICY "Reviews are viewable by all" ON app_reviews FOR SELECT USING (true);
  END IF;

  -- app_usage policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='app_usage' AND policyname='System can record usage'
  ) THEN
    CREATE POLICY "System can record usage" ON app_usage FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='app_usage' AND policyname='Teachers can view their usage'
  ) THEN
    CREATE POLICY "Teachers can view their usage" ON app_usage FOR SELECT USING (teacher_id = auth.uid());
  END IF;

  -- app_flags policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='app_flags' AND policyname='Teachers can flag apps'
  ) THEN
    CREATE POLICY "Teachers can flag apps" ON app_flags FOR INSERT WITH CHECK (teacher_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='app_flags' AND policyname='Teachers can view their flags'
  ) THEN
    CREATE POLICY "Teachers can view their flags" ON app_flags FOR SELECT USING (teacher_id = auth.uid());
  END IF;
END$$;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('apps', 'apps', true, 10485760, ARRAY['text/html'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Apps are publicly accessible'
  ) THEN
    CREATE POLICY "Apps are publicly accessible" ON storage.objects
      FOR SELECT USING (bucket_id = 'apps');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Authors can upload apps'
  ) THEN
    CREATE POLICY "Authors can upload apps" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'apps' AND auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Authors can update their apps'
  ) THEN
    CREATE POLICY "Authors can update their apps" ON storage.objects
      FOR UPDATE USING (bucket_id = 'apps' AND auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Authors can delete their apps'
  ) THEN
    CREATE POLICY "Authors can delete their apps" ON storage.objects
      FOR DELETE USING (bucket_id = 'apps' AND auth.uid() IS NOT NULL);
  END IF;
END$$;

-- HNSW index for vector similarity (лучше для высокоразмерных векторов)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_apps_embedding'
  ) THEN
    CREATE INDEX idx_apps_embedding ON apps USING hnsw (embedding vector_cosine_ops);
  END IF;
EXCEPTION
  WHEN insufficient_privilege OR feature_not_supported THEN
    NULL;
END$$;