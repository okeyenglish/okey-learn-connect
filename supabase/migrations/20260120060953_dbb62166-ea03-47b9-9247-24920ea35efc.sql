-- Drop old indexes and functions
DROP INDEX IF EXISTS idx_chat_messages_text_search;
DROP INDEX IF EXISTS idx_clients_name_gin;
DROP FUNCTION IF EXISTS search_messages_by_text;
DROP FUNCTION IF EXISTS search_clients_by_name;

-- Create simple trigram index for ILIKE performance (much faster than GIN FTS for partial matching)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram index for message_text search
CREATE INDEX IF NOT EXISTS idx_chat_messages_text_trgm 
ON chat_messages 
USING GIN (message_text gin_trgm_ops);

-- Trigram index for client name search  
CREATE INDEX IF NOT EXISTS idx_clients_name_trgm 
ON clients 
USING GIN ((coalesce(name, '') || ' ' || coalesce(first_name, '') || ' ' || coalesce(last_name, '')) gin_trgm_ops);

-- RPC function for fast message search using trigram (ILIKE with index)
CREATE OR REPLACE FUNCTION search_messages_by_text(
  p_org_id uuid,
  p_search_text text,
  p_limit int DEFAULT 100
)
RETURNS TABLE(client_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT cm.client_id
  FROM chat_messages cm
  WHERE cm.organization_id = p_org_id
    AND cm.message_text ILIKE '%' || p_search_text || '%'
  ORDER BY cm.client_id
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

-- RPC function for fast client name search using trigram
CREATE OR REPLACE FUNCTION search_clients_by_name(
  p_org_id uuid,
  p_search_text text,
  p_limit int DEFAULT 100
)
RETURNS TABLE(id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id
  FROM clients c
  WHERE c.organization_id = p_org_id
    AND c.is_active = true
    AND (
      c.name ILIKE '%' || p_search_text || '%'
      OR c.first_name ILIKE '%' || p_search_text || '%'
      OR c.last_name ILIKE '%' || p_search_text || '%'
    )
  ORDER BY c.id
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;