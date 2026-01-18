-- Drop broken RPC functions
DROP FUNCTION IF EXISTS public.get_chat_threads_fast(integer);
DROP FUNCTION IF EXISTS public.get_chat_threads_optimized(integer);
DROP FUNCTION IF EXISTS public.get_chat_threads_by_client_ids(uuid[]);

-- Recreate get_chat_threads_optimized with proper organization_id handling
CREATE OR REPLACE FUNCTION public.get_chat_threads_optimized(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  clt_id UUID,
  client_name TEXT,
  client_phone TEXT,
  avatar_url TEXT,
  telegram_avatar_url TEXT,
  whatsapp_avatar_url TEXT,
  max_avatar_url TEXT,
  telegram_chat_id TEXT,
  whatsapp_chat_id TEXT,
  max_chat_id TEXT,
  last_message_text TEXT,
  last_message_time TIMESTAMPTZ,
  last_messenger_type TEXT,
  unread_count BIGINT,
  last_unread_messenger TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Get organization_id using the existing multi-tenant function
  v_org_id := get_user_organization_id();
  
  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH recent_clients AS (
    SELECT DISTINCT ON (cm.client_id) 
      cm.client_id AS cid,
      cm.message_text,
      cm.created_at,
      cm.messenger_type::TEXT
    FROM chat_messages cm
    WHERE cm.organization_id = v_org_id
    ORDER BY cm.client_id, cm.created_at DESC
  ),
  unread_stats AS (
    SELECT 
      cm.client_id AS cid,
      COUNT(*) AS cnt,
      MAX(cm.messenger_type::TEXT) AS last_messenger
    FROM chat_messages cm
    WHERE cm.organization_id = v_org_id
      AND cm.is_read = false
      AND cm.is_outgoing = false
    GROUP BY cm.client_id
  )
  SELECT 
    c.id AS clt_id,
    c.name::TEXT AS client_name,
    c.phone::TEXT AS client_phone,
    c.avatar_url::TEXT,
    c.telegram_avatar_url::TEXT,
    c.whatsapp_avatar_url::TEXT,
    c.max_avatar_url::TEXT,
    c.telegram_chat_id::TEXT,
    c.whatsapp_chat_id::TEXT,
    c.max_chat_id::TEXT,
    rc.message_text::TEXT AS last_message_text,
    rc.created_at AS last_message_time,
    rc.messenger_type::TEXT AS last_messenger_type,
    COALESCE(us.cnt, 0) AS unread_count,
    us.last_messenger::TEXT AS last_unread_messenger
  FROM recent_clients rc
  JOIN clients c ON c.id = rc.cid
  LEFT JOIN unread_stats us ON us.cid = rc.cid
  WHERE c.organization_id = v_org_id
    AND c.name NOT IN ('Telegram Group', 'Corporate Chat', 'Teachers Chat', 'Communities Chat')
    AND c.telegram_chat_id NOT LIKE '-%'
  ORDER BY rc.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Recreate get_chat_threads_fast as fallback
CREATE OR REPLACE FUNCTION public.get_chat_threads_fast(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  clt_id UUID,
  client_name TEXT,
  client_phone TEXT,
  avatar_url TEXT,
  telegram_avatar_url TEXT,
  whatsapp_avatar_url TEXT,
  max_avatar_url TEXT,
  telegram_chat_id TEXT,
  whatsapp_chat_id TEXT,
  max_chat_id TEXT,
  last_message_text TEXT,
  last_message_time TIMESTAMPTZ,
  last_messenger_type TEXT,
  unread_count BIGINT,
  last_unread_messenger TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  v_org_id := get_user_organization_id();
  
  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    c.id AS clt_id,
    c.name::TEXT AS client_name,
    c.phone::TEXT AS client_phone,
    c.avatar_url::TEXT,
    c.telegram_avatar_url::TEXT,
    c.whatsapp_avatar_url::TEXT,
    c.max_avatar_url::TEXT,
    c.telegram_chat_id::TEXT,
    c.whatsapp_chat_id::TEXT,
    c.max_chat_id::TEXT,
    NULL::TEXT AS last_message_text,
    c.last_message_at AS last_message_time,
    NULL::TEXT AS last_messenger_type,
    0::BIGINT AS unread_count,
    NULL::TEXT AS last_unread_messenger
  FROM clients c
  WHERE c.organization_id = v_org_id
    AND c.last_message_at IS NOT NULL
    AND c.name NOT IN ('Telegram Group', 'Corporate Chat', 'Teachers Chat', 'Communities Chat')
    AND (c.telegram_chat_id IS NULL OR c.telegram_chat_id NOT LIKE '-%')
  ORDER BY c.last_message_at DESC
  LIMIT p_limit;
END;
$$;

-- Recreate get_chat_threads_by_client_ids for missing unread threads
CREATE OR REPLACE FUNCTION public.get_chat_threads_by_client_ids(p_client_ids UUID[])
RETURNS TABLE (
  clt_id UUID,
  client_name TEXT,
  client_phone TEXT,
  avatar_url TEXT,
  telegram_avatar_url TEXT,
  whatsapp_avatar_url TEXT,
  max_avatar_url TEXT,
  telegram_chat_id TEXT,
  whatsapp_chat_id TEXT,
  max_chat_id TEXT,
  last_message_text TEXT,
  last_message_time TIMESTAMPTZ,
  last_messenger_type TEXT,
  unread_count BIGINT,
  last_unread_messenger TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  v_org_id := get_user_organization_id();
  
  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH unread_stats AS (
    SELECT 
      cm.client_id AS cid,
      COUNT(*) AS cnt,
      MAX(cm.messenger_type::TEXT) AS last_messenger
    FROM chat_messages cm
    WHERE cm.client_id = ANY(p_client_ids)
      AND cm.organization_id = v_org_id
      AND cm.is_read = false
      AND cm.is_outgoing = false
    GROUP BY cm.client_id
  ),
  last_messages AS (
    SELECT DISTINCT ON (cm.client_id)
      cm.client_id AS cid,
      cm.message_text,
      cm.created_at,
      cm.messenger_type::TEXT
    FROM chat_messages cm
    WHERE cm.client_id = ANY(p_client_ids)
      AND cm.organization_id = v_org_id
    ORDER BY cm.client_id, cm.created_at DESC
  )
  SELECT 
    c.id AS clt_id,
    c.name::TEXT AS client_name,
    c.phone::TEXT AS client_phone,
    c.avatar_url::TEXT,
    c.telegram_avatar_url::TEXT,
    c.whatsapp_avatar_url::TEXT,
    c.max_avatar_url::TEXT,
    c.telegram_chat_id::TEXT,
    c.whatsapp_chat_id::TEXT,
    c.max_chat_id::TEXT,
    lm.message_text::TEXT AS last_message_text,
    lm.created_at AS last_message_time,
    lm.messenger_type::TEXT AS last_messenger_type,
    COALESCE(us.cnt, 0) AS unread_count,
    us.last_messenger::TEXT AS last_unread_messenger
  FROM clients c
  LEFT JOIN last_messages lm ON lm.cid = c.id
  LEFT JOIN unread_stats us ON us.cid = c.id
  WHERE c.id = ANY(p_client_ids)
    AND c.organization_id = v_org_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_chat_threads_optimized(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_chat_threads_fast(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_chat_threads_by_client_ids(uuid[]) TO authenticated;