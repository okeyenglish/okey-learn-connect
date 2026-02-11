-- =====================================================
-- HOTFIX: get_unread_chat_threads — добавить превью последнего сообщения
-- Выполнить на self-hosted Supabase: api.academyos.ru
-- После выполнения: NOTIFY pgrst, 'reload schema';
-- =====================================================

DROP FUNCTION IF EXISTS get_unread_chat_threads(integer);
DROP FUNCTION IF EXISTS get_unread_chat_threads(integer, text[]);

CREATE OR REPLACE FUNCTION get_unread_chat_threads(
  p_limit INTEGER DEFAULT 100,
  p_branches TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  clt_id UUID,
  client_name TEXT,
  first_name TEXT,
  last_name TEXT,
  middle_name TEXT,
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
    WHERE m.is_read = false 
      AND m.is_outgoing = false
      AND m.client_id IS NOT NULL
    LIMIT p_limit * 2
  ),
  client_data AS (
    SELECT 
      c.id,
      c.name,
      c.first_name,
      c.last_name,
      c.middle_name,
      c.phone,
      c.branch,
      NULL::text as avatar_url,
      NULL::text as telegram_avatar_url,
      NULL::text as whatsapp_avatar_url,
      NULL::text as max_avatar_url,
      c.telegram_user_id::text as telegram_chat_id,
      NULL::text as whatsapp_chat_id,
      NULL::text as max_chat_id,
      c.last_message_at
    FROM clients c
    WHERE c.id IN (SELECT client_id FROM clients_with_unread)
      AND COALESCE(c.is_active, true) = true
      AND (p_branches IS NULL OR c.branch IS NULL OR c.branch = ANY(p_branches))
  ),
  last_msgs AS (
    SELECT DISTINCT ON (cm.client_id)
      cm.client_id,
      cm.message_text,
      cm.created_at,
      cm.messenger_type
    FROM chat_messages cm
    WHERE cm.client_id IN (SELECT id FROM client_data)
    ORDER BY cm.client_id, cm.created_at DESC
  ),
  unread_stats AS (
    SELECT 
      m.client_id,
      COUNT(*) as total_unread,
      MAX(m.created_at) as last_unread_time
    FROM chat_messages m
    WHERE m.client_id IN (SELECT id FROM client_data)
      AND m.is_read = false
      AND m.is_outgoing = false
    GROUP BY m.client_id
  )
  SELECT 
    cd.id as clt_id,
    cd.name as client_name,
    cd.first_name,
    cd.last_name,
    cd.middle_name,
    cd.phone as client_phone,
    cd.branch as client_branch,
    cd.avatar_url,
    cd.telegram_avatar_url,
    cd.whatsapp_avatar_url,
    cd.max_avatar_url,
    cd.telegram_chat_id,
    cd.whatsapp_chat_id,
    cd.max_chat_id,
    lm.message_text as last_message_text,
    COALESCE(us.last_unread_time, cd.last_message_at) as last_message_time,
    us.total_unread as unread_count,
    0::bigint as unread_whatsapp,
    0::bigint as unread_telegram,
    0::bigint as unread_max,
    0::bigint as unread_email,
    0::bigint as unread_calls,
    NULL::text as last_unread_messenger
  FROM client_data cd
  LEFT JOIN last_msgs lm ON lm.client_id = cd.id
  JOIN unread_stats us ON us.client_id = cd.id
  ORDER BY us.total_unread DESC, us.last_unread_time DESC NULLS LAST
  LIMIT p_limit;
$$;

NOTIFY pgrst, 'reload schema';
