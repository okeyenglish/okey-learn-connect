-- RPC функция для пагинированной загрузки чатов
CREATE OR REPLACE FUNCTION public.get_chat_threads_paginated(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
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
  WITH last_msgs AS (
    SELECT DISTINCT ON (cm.client_id)
      cm.client_id AS cid,
      cm.message_text,
      cm.messenger_type::TEXT AS msg_type
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
    lm.message_text::TEXT AS last_message_text,
    c.last_message_at AS last_message_time,
    lm.msg_type::TEXT AS last_messenger_type,
    COALESCE(us.cnt, 0) AS unread_count,
    us.last_messenger::TEXT AS last_unread_messenger
  FROM clients c
  LEFT JOIN last_msgs lm ON lm.cid = c.id
  LEFT JOIN unread_stats us ON us.cid = c.id
  WHERE c.organization_id = v_org_id
    AND c.last_message_at IS NOT NULL
    AND c.name NOT IN ('Telegram Group', 'Corporate Chat', 'Teachers Chat', 'Communities Chat')
    AND (c.telegram_chat_id IS NULL OR c.telegram_chat_id NOT LIKE '-%')
  ORDER BY c.last_message_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- RPC функция для загрузки только непрочитанных чатов (быстрая)
CREATE OR REPLACE FUNCTION public.get_unread_chat_threads(p_limit INTEGER DEFAULT 50)
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
  WITH unread_clients AS (
    -- Get clients with unread messages using partial index
    SELECT DISTINCT cm.client_id AS cid
    FROM chat_messages cm
    WHERE cm.organization_id = v_org_id
      AND cm.is_read = false
      AND cm.message_type = 'client'
    LIMIT 500
  ),
  last_msgs AS (
    SELECT DISTINCT ON (cm.client_id)
      cm.client_id AS cid,
      cm.message_text,
      cm.messenger_type::TEXT AS msg_type
    FROM chat_messages cm
    WHERE cm.client_id IN (SELECT cid FROM unread_clients)
    ORDER BY cm.client_id, cm.created_at DESC
  ),
  unread_stats AS (
    SELECT 
      cm.client_id AS cid,
      COUNT(*) AS cnt,
      MAX(cm.messenger_type::TEXT) AS last_messenger
    FROM chat_messages cm
    WHERE cm.client_id IN (SELECT cid FROM unread_clients)
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
    lm.message_text::TEXT AS last_message_text,
    c.last_message_at AS last_message_time,
    lm.msg_type::TEXT AS last_messenger_type,
    COALESCE(us.cnt, 0) AS unread_count,
    us.last_messenger::TEXT AS last_unread_messenger
  FROM clients c
  INNER JOIN unread_clients uc ON uc.cid = c.id
  LEFT JOIN last_msgs lm ON lm.cid = c.id
  LEFT JOIN unread_stats us ON us.cid = c.id
  WHERE c.name NOT IN ('Telegram Group', 'Corporate Chat', 'Teachers Chat', 'Communities Chat')
    AND (c.telegram_chat_id IS NULL OR c.telegram_chat_id NOT LIKE '-%')
  ORDER BY c.last_message_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_chat_threads_paginated(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_chat_threads(integer) TO authenticated;

COMMENT ON FUNCTION public.get_chat_threads_paginated IS 'Paginated chat threads loading for infinite scroll';
COMMENT ON FUNCTION public.get_unread_chat_threads IS 'Fast loading of only unread chat threads';