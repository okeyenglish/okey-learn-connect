-- Fix get_chat_threads_paginated and get_unread_chat_threads to ignore unread when last message is outgoing

-- Fix get_chat_threads_paginated
CREATE OR REPLACE FUNCTION get_chat_threads_paginated(p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (
  clt_id UUID,
  client_name TEXT,
  client_phone TEXT,
  client_branch TEXT,
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
  unread_whatsapp BIGINT,
  unread_telegram BIGINT,
  unread_max BIGINT,
  unread_email BIGINT,
  unread_calls BIGINT,
  last_unread_messenger TEXT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH recent_clients AS (
    SELECT c.id, c.name, c.phone, c.branch, c.avatar_url,
           c.telegram_avatar_url, c.whatsapp_avatar_url, c.max_avatar_url,
           c.telegram_chat_id, c.whatsapp_chat_id, c.max_chat_id, c.last_message_at
    FROM clients c
    WHERE c.is_active = true
    ORDER BY c.last_message_at DESC NULLS LAST
    LIMIT p_limit OFFSET p_offset
  ),
  last_msg AS (
    SELECT DISTINCT ON (m.client_id)
           m.client_id,
           m.message_text,
           m.messenger_type::TEXT AS msg_type,
           m.created_at,
           m.is_outgoing
    FROM chat_messages m
    WHERE m.client_id IN (SELECT id FROM recent_clients)
    ORDER BY m.client_id, m.created_at DESC
  ),
  unread_counts AS (
    SELECT m.client_id,
           COUNT(*) FILTER (WHERE NOT m.is_read AND NOT m.is_outgoing) AS total_unread,
           COUNT(*) FILTER (WHERE NOT m.is_read AND NOT m.is_outgoing AND m.messenger_type = 'whatsapp') AS unread_wa,
           COUNT(*) FILTER (WHERE NOT m.is_read AND NOT m.is_outgoing AND m.messenger_type = 'telegram') AS unread_tg,
           COUNT(*) FILTER (WHERE NOT m.is_read AND NOT m.is_outgoing AND m.messenger_type = 'max') AS unread_mx,
           COUNT(*) FILTER (WHERE NOT m.is_read AND NOT m.is_outgoing AND m.messenger_type = 'email') AS unread_em,
           COUNT(*) FILTER (WHERE NOT m.is_read AND NOT m.is_outgoing AND m.message_type = 'call') AS unread_calls,
           (ARRAY_AGG(m.messenger_type::TEXT ORDER BY m.created_at DESC) FILTER (WHERE NOT m.is_read AND NOT m.is_outgoing))[1] AS last_unread_msg
    FROM chat_messages m
    WHERE m.client_id IN (SELECT id FROM recent_clients)
    GROUP BY m.client_id
  )
  SELECT 
    c.id AS clt_id,
    c.name::TEXT AS client_name,
    c.phone::TEXT AS client_phone,
    c.branch::TEXT AS client_branch,
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
    -- If last message is outgoing, chat is always "read"
    CASE WHEN lm.is_outgoing = true THEN 0::BIGINT ELSE COALESCE(uc.total_unread, 0)::BIGINT END AS unread_count,
    CASE WHEN lm.is_outgoing = true THEN 0::BIGINT ELSE COALESCE(uc.unread_wa, 0)::BIGINT END AS unread_whatsapp,
    CASE WHEN lm.is_outgoing = true THEN 0::BIGINT ELSE COALESCE(uc.unread_tg, 0)::BIGINT END AS unread_telegram,
    CASE WHEN lm.is_outgoing = true THEN 0::BIGINT ELSE COALESCE(uc.unread_mx, 0)::BIGINT END AS unread_max,
    CASE WHEN lm.is_outgoing = true THEN 0::BIGINT ELSE COALESCE(uc.unread_em, 0)::BIGINT END AS unread_email,
    CASE WHEN lm.is_outgoing = true THEN 0::BIGINT ELSE COALESCE(uc.unread_calls, 0)::BIGINT END AS unread_calls,
    CASE WHEN lm.is_outgoing = true THEN NULL ELSE uc.last_unread_msg::TEXT END AS last_unread_messenger
  FROM recent_clients c
  LEFT JOIN last_msg lm ON lm.client_id = c.id
  LEFT JOIN unread_counts uc ON uc.client_id = c.id
  ORDER BY c.last_message_at DESC NULLS LAST;
$$;

-- Fix get_unread_chat_threads
CREATE OR REPLACE FUNCTION get_unread_chat_threads(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  clt_id UUID,
  client_name TEXT,
  client_phone TEXT,
  client_branch TEXT,
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
  unread_whatsapp BIGINT,
  unread_telegram BIGINT,
  unread_max BIGINT,
  unread_email BIGINT,
  unread_calls BIGINT,
  last_unread_messenger TEXT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH clients_with_unread AS (
    SELECT DISTINCT m.client_id
    FROM chat_messages m
    WHERE NOT m.is_read AND NOT m.is_outgoing
    LIMIT p_limit
  ),
  recent_clients AS (
    SELECT c.id, c.name, c.phone, c.branch, c.avatar_url,
           c.telegram_avatar_url, c.whatsapp_avatar_url, c.max_avatar_url,
           c.telegram_chat_id, c.whatsapp_chat_id, c.max_chat_id, c.last_message_at
    FROM clients c
    WHERE c.id IN (SELECT client_id FROM clients_with_unread)
      AND c.is_active = true
  ),
  last_msg AS (
    SELECT DISTINCT ON (m.client_id)
           m.client_id,
           m.message_text,
           m.messenger_type::TEXT AS msg_type,
           m.created_at,
           m.is_outgoing
    FROM chat_messages m
    WHERE m.client_id IN (SELECT id FROM recent_clients)
    ORDER BY m.client_id, m.created_at DESC
  ),
  unread_counts AS (
    SELECT m.client_id,
           COUNT(*) FILTER (WHERE NOT m.is_read AND NOT m.is_outgoing) AS total_unread,
           COUNT(*) FILTER (WHERE NOT m.is_read AND NOT m.is_outgoing AND m.messenger_type = 'whatsapp') AS unread_wa,
           COUNT(*) FILTER (WHERE NOT m.is_read AND NOT m.is_outgoing AND m.messenger_type = 'telegram') AS unread_tg,
           COUNT(*) FILTER (WHERE NOT m.is_read AND NOT m.is_outgoing AND m.messenger_type = 'max') AS unread_mx,
           COUNT(*) FILTER (WHERE NOT m.is_read AND NOT m.is_outgoing AND m.messenger_type = 'email') AS unread_em,
           COUNT(*) FILTER (WHERE NOT m.is_read AND NOT m.is_outgoing AND m.message_type = 'call') AS unread_calls,
           (ARRAY_AGG(m.messenger_type::TEXT ORDER BY m.created_at DESC) FILTER (WHERE NOT m.is_read AND NOT m.is_outgoing))[1] AS last_unread_msg
    FROM chat_messages m
    WHERE m.client_id IN (SELECT id FROM recent_clients)
    GROUP BY m.client_id
  )
  SELECT 
    c.id AS clt_id,
    c.name::TEXT AS client_name,
    c.phone::TEXT AS client_phone,
    c.branch::TEXT AS client_branch,
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
    -- If last message is outgoing, chat is always "read" (effectively filters out this chat)
    CASE WHEN lm.is_outgoing = true THEN 0::BIGINT ELSE COALESCE(uc.total_unread, 0)::BIGINT END AS unread_count,
    CASE WHEN lm.is_outgoing = true THEN 0::BIGINT ELSE COALESCE(uc.unread_wa, 0)::BIGINT END AS unread_whatsapp,
    CASE WHEN lm.is_outgoing = true THEN 0::BIGINT ELSE COALESCE(uc.unread_tg, 0)::BIGINT END AS unread_telegram,
    CASE WHEN lm.is_outgoing = true THEN 0::BIGINT ELSE COALESCE(uc.unread_mx, 0)::BIGINT END AS unread_max,
    CASE WHEN lm.is_outgoing = true THEN 0::BIGINT ELSE COALESCE(uc.unread_em, 0)::BIGINT END AS unread_email,
    CASE WHEN lm.is_outgoing = true THEN 0::BIGINT ELSE COALESCE(uc.unread_calls, 0)::BIGINT END AS unread_calls,
    CASE WHEN lm.is_outgoing = true THEN NULL ELSE uc.last_unread_msg::TEXT END AS last_unread_messenger
  FROM recent_clients c
  LEFT JOIN last_msg lm ON lm.client_id = c.id
  LEFT JOIN unread_counts uc ON uc.client_id = c.id
  -- Only include chats where last message is incoming AND there are unread incoming messages
  WHERE lm.is_outgoing = false AND COALESCE(uc.total_unread, 0) > 0
  ORDER BY c.last_message_at DESC NULLS LAST;
$$;