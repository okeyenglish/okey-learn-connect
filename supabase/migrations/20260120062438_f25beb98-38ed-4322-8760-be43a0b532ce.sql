-- Drop ALL versions of the function first
DROP FUNCTION IF EXISTS public.search_messages_by_text(text, uuid, integer);
DROP FUNCTION IF EXISTS public.search_messages_by_text(uuid, text, integer);
DROP FUNCTION IF EXISTS public.search_messages_by_text(p_search_text text, p_org_id uuid, p_limit integer);
DROP FUNCTION IF EXISTS public.search_messages_by_text(p_org_id uuid, p_search_text text, p_limit integer);

-- Recreate with correct parameter order matching the client call
CREATE OR REPLACE FUNCTION public.search_messages_by_text(
  p_org_id uuid,
  p_search_text text,
  p_limit integer DEFAULT 50
)
RETURNS TABLE(client_id uuid, messenger_type text)
LANGUAGE plpgsql
STABLE
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
  ORDER BY cm.client_id, cm.created_at DESC
  LIMIT p_limit;
END;
$$;