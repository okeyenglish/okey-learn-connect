-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- Create docs table for knowledge base
CREATE TABLE IF NOT EXISTS public.docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  tokens INTEGER,
  embedding VECTOR(1536),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS docs_url_idx ON public.docs(url);
CREATE INDEX IF NOT EXISTS docs_embedding_idx ON public.docs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- RPC function for vector similarity search
CREATE OR REPLACE FUNCTION public.match_docs(query_embedding VECTOR(1536), match_count INT)
RETURNS TABLE (
  id UUID,
  url TEXT,
  title TEXT,
  content TEXT,
  similarity FLOAT
) LANGUAGE SQL STABLE AS $$
  SELECT d.id, d.url, d.title, d.content,
         1 - (d.embedding <=> query_embedding) AS similarity
  FROM public.docs d
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Enable RLS
ALTER TABLE public.docs ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY IF NOT EXISTS "docs_read_all" ON public.docs FOR SELECT USING (true);

-- Allow service role to manage docs
CREATE POLICY IF NOT EXISTS "docs_service_manage" ON public.docs FOR ALL USING (true);