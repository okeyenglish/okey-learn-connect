-- Fix function search path security issue
CREATE OR REPLACE FUNCTION public.match_docs(query_embedding VECTOR(1536), match_count INT)
RETURNS TABLE (
  id UUID,
  url TEXT,
  title TEXT,
  content TEXT,
  similarity FLOAT
) LANGUAGE SQL STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.url, d.title, d.content,
         1 - (d.embedding <=> query_embedding) AS similarity
  FROM public.docs d
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;