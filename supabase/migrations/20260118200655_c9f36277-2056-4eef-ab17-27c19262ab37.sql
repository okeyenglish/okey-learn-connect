-- Update get_chat_threads_fast to exclude system messages from last_message_text preview
DROP FUNCTION IF EXISTS public.get_chat_threads_fast(integer);

CREATE OR REPLACE FUNCTION public.get_chat_threads_fast(p_limit INTEGER DEFAULT 100)
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
LANGUAGE sql STABLE AS $$
  WITH recent_clients AS (
    SELECT c.id, c.name, c.phone, c.branch, c.avatar_url,
           c.telegram_avatar_url, c.whatsapp_avatar_url, c.max_avatar_url,
           c.telegram_chat_id, c.whatsapp_chat_id, c.max_chat_id, c.last_message_at
    FROM clients c
    WHERE c.is_active = true
    ORDER BY c.last_message_at DESC NULLS LAST
    LIMIT p_limit
  ),
  -- Get last non-system message for each client (excluding system/automated messages)
  last_msg AS (
    SELECT DISTINCT ON (m.client_id)
           m.client_id,
           m.message_text,
           m.messenger_type::TEXT AS msg_type,
           m.created_at
    FROM chat_messages m
    WHERE m.client_id IN (SELECT id FROM recent_clients)
      -- Exclude system messages from preview
      AND m.message_type NOT IN ('system', 'call', 'missed_call')
      AND m.message_text NOT LIKE 'new_pay%'
      AND m.message_text NOT LIKE '%_success %'
      AND m.message_text NOT LIKE 'crm_state_changed%'
      AND m.message_text NOT LIKE 'gnb%_success%'
    ORDER BY m.client_id, m.created_at DESC
  ),
  unread_counts AS (
    SELECT m.client_id,
           COUNT(*) FILTER (WHERE NOT m.is_read) AS total_unread,
           COUNT(*) FILTER (WHERE NOT m.is_read AND m.messenger_type = 'whatsapp') AS unread_wa,
           COUNT(*) FILTER (WHERE NOT m.is_read AND m.messenger_type = 'telegram') AS unread_tg,
           COUNT(*) FILTER (WHERE NOT m.is_read AND m.messenger_type = 'max') AS unread_mx,
           COUNT(*) FILTER (WHERE NOT m.is_read AND m.messenger_type = 'email') AS unread_em,
           COUNT(*) FILTER (WHERE NOT m.is_read AND m.message_type = 'call') AS unread_calls,
           (ARRAY_AGG(m.messenger_type::TEXT ORDER BY m.created_at DESC) FILTER (WHERE NOT m.is_read))[1] AS last_unread_msg
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
    COALESCE(uc.total_unread, 0) AS unread_count,
    COALESCE(uc.unread_wa, 0) AS unread_whatsapp,
    COALESCE(uc.unread_tg, 0) AS unread_telegram,
    COALESCE(uc.unread_mx, 0) AS unread_max,
    COALESCE(uc.unread_em, 0) AS unread_email,
    COALESCE(uc.unread_calls, 0) AS unread_calls,
    uc.last_unread_msg::TEXT AS last_unread_messenger
  FROM recent_clients c
  LEFT JOIN last_msg lm ON lm.client_id = c.id
  LEFT JOIN unread_counts uc ON uc.client_id = c.id
  ORDER BY c.last_message_at DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_chat_threads_fast(integer) TO authenticated;

-- Also update get_chat_threads_paginated if it exists
DROP FUNCTION IF EXISTS public.get_chat_threads_paginated(integer, integer);

CREATE OR REPLACE FUNCTION public.get_chat_threads_paginated(p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0)
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
LANGUAGE sql STABLE AS $$
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
           m.created_at
    FROM chat_messages m
    WHERE m.client_id IN (SELECT id FROM recent_clients)
      AND m.message_type NOT IN ('system', 'call', 'missed_call')
      AND m.message_text NOT LIKE 'new_pay%'
      AND m.message_text NOT LIKE '%_success %'
      AND m.message_text NOT LIKE 'crm_state_changed%'
      AND m.message_text NOT LIKE 'gnb%_success%'
    ORDER BY m.client_id, m.created_at DESC
  ),
  unread_counts AS (
    SELECT m.client_id,
           COUNT(*) FILTER (WHERE NOT m.is_read) AS total_unread,
           COUNT(*) FILTER (WHERE NOT m.is_read AND m.messenger_type = 'whatsapp') AS unread_wa,
           COUNT(*) FILTER (WHERE NOT m.is_read AND m.messenger_type = 'telegram') AS unread_tg,
           COUNT(*) FILTER (WHERE NOT m.is_read AND m.messenger_type = 'max') AS unread_mx,
           COUNT(*) FILTER (WHERE NOT m.is_read AND m.messenger_type = 'email') AS unread_em,
           COUNT(*) FILTER (WHERE NOT m.is_read AND m.message_type = 'call') AS unread_calls,
           (ARRAY_AGG(m.messenger_type::TEXT ORDER BY m.created_at DESC) FILTER (WHERE NOT m.is_read))[1] AS last_unread_msg
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
    COALESCE(uc.total_unread, 0) AS unread_count,
    COALESCE(uc.unread_wa, 0) AS unread_whatsapp,
    COALESCE(uc.unread_tg, 0) AS unread_telegram,
    COALESCE(uc.unread_mx, 0) AS unread_max,
    COALESCE(uc.unread_em, 0) AS unread_email,
    COALESCE(uc.unread_calls, 0) AS unread_calls,
    uc.last_unread_msg::TEXT AS last_unread_messenger
  FROM recent_clients c
  LEFT JOIN last_msg lm ON lm.client_id = c.id
  LEFT JOIN unread_counts uc ON uc.client_id = c.id
  ORDER BY c.last_message_at DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_chat_threads_paginated(integer, integer) TO authenticated;

-- Also update get_unread_chat_threads if it exists
DROP FUNCTION IF EXISTS public.get_unread_chat_threads(integer);

CREATE OR REPLACE FUNCTION public.get_unread_chat_threads(p_limit INTEGER DEFAULT 50)
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
LANGUAGE sql STABLE AS $$
  WITH clients_with_unread AS (
    SELECT DISTINCT m.client_id
    FROM chat_messages m
    WHERE NOT m.is_read
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
           m.created_at
    FROM chat_messages m
    WHERE m.client_id IN (SELECT id FROM recent_clients)
      AND m.message_type NOT IN ('system', 'call', 'missed_call')
      AND m.message_text NOT LIKE 'new_pay%'
      AND m.message_text NOT LIKE '%_success %'
      AND m.message_text NOT LIKE 'crm_state_changed%'
      AND m.message_text NOT LIKE 'gnb%_success%'
    ORDER BY m.client_id, m.created_at DESC
  ),
  unread_counts AS (
    SELECT m.client_id,
           COUNT(*) FILTER (WHERE NOT m.is_read) AS total_unread,
           COUNT(*) FILTER (WHERE NOT m.is_read AND m.messenger_type = 'whatsapp') AS unread_wa,
           COUNT(*) FILTER (WHERE NOT m.is_read AND m.messenger_type = 'telegram') AS unread_tg,
           COUNT(*) FILTER (WHERE NOT m.is_read AND m.messenger_type = 'max') AS unread_mx,
           COUNT(*) FILTER (WHERE NOT m.is_read AND m.messenger_type = 'email') AS unread_em,
           COUNT(*) FILTER (WHERE NOT m.is_read AND m.message_type = 'call') AS unread_calls,
           (ARRAY_AGG(m.messenger_type::TEXT ORDER BY m.created_at DESC) FILTER (WHERE NOT m.is_read))[1] AS last_unread_msg
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
    COALESCE(uc.total_unread, 0) AS unread_count,
    COALESCE(uc.unread_wa, 0) AS unread_whatsapp,
    COALESCE(uc.unread_tg, 0) AS unread_telegram,
    COALESCE(uc.unread_mx, 0) AS unread_max,
    COALESCE(uc.unread_em, 0) AS unread_email,
    COALESCE(uc.unread_calls, 0) AS unread_calls,
    uc.last_unread_msg::TEXT AS last_unread_messenger
  FROM recent_clients c
  LEFT JOIN last_msg lm ON lm.client_id = c.id
  LEFT JOIN unread_counts uc ON uc.client_id = c.id
  WHERE COALESCE(uc.total_unread, 0) > 0
  ORDER BY c.last_message_at DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_unread_chat_threads(integer) TO authenticated;