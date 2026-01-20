-- Enable btree_gin extension for composite GIN indexes
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Create composite index for organization_id + message_text trigram search
-- This allows PostgreSQL to use a single index for both org filtering AND text search
CREATE INDEX IF NOT EXISTS idx_chat_messages_org_text_trgm 
ON chat_messages 
USING gin (organization_id, message_text gin_trgm_ops);

-- Drop existing function
DROP FUNCTION IF EXISTS public.search_messages_by_text(uuid, text, integer);

-- Create optimized RPC with date filtering for faster search
-- Searches last 90 days by default, caller can expand if needed
CREATE OR REPLACE FUNCTION public.search_messages_by_text(
  p_org_id uuid,
  p_search_text text,
  p_limit integer DEFAULT 50,
  p_days_back integer DEFAULT 90
)
RETURNS TABLE(client_id uuid, messenger_type text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (cm.client_id) 
    cm.client_id,
    cm.messenger_type::text
  FROM chat_messages cm
  WHERE cm.organization_id = p_org_id
    AND cm.message_text ILIKE '%' || p_search_text || '%'
    AND (p_days_back IS NULL OR cm.created_at > NOW() - (p_days_back || ' days')::interval)
  ORDER BY cm.client_id, cm.created_at DESC
  LIMIT p_limit;
END;
$$;