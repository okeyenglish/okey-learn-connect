-- Оптимизированная версия get_unread_chat_threads для self-hosted
-- МИНИМАЛЬНАЯ версия - только базовые колонки chat_messages
-- 
-- Выполнить на self-hosted базе: api.academyos.ru
-- После выполнения: NOTIFY pgrst, 'reload schema';

-- Сначала удаляем старую версию функции
DROP FUNCTION IF EXISTS get_unread_chat_threads(integer);

CREATE OR REPLACE FUNCTION get_unread_chat_threads(p_limit INTEGER DEFAULT 100)
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
  ),
  unread_stats AS (
    SELECT 
      m.client_id,
      COUNT(*) as total_unread,
      -- Без разбивки по мессенджерам (колонка messenger отсутствует)
      0::bigint as unread_wa,
      0::bigint as unread_tg,
      0::bigint as unread_max,
      0::bigint as unread_email,
      0::bigint as unread_calls,
      MAX(m.created_at) as last_unread_time,
      NULL::text as last_messenger
    FROM chat_messages m
    WHERE m.client_id IN (SELECT client_id FROM clients_with_unread)
      AND m.is_read = false
      AND m.is_outgoing = false
    GROUP BY m.client_id
  ),
  last_messages AS (
    SELECT DISTINCT ON (m.client_id)
      m.client_id,
      m.content as last_text,
      m.created_at as last_time
    FROM chat_messages m
    WHERE m.client_id IN (SELECT client_id FROM clients_with_unread)
    ORDER BY m.client_id, m.created_at DESC
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
    lm.last_text as last_message_text,
    COALESCE(lm.last_time, cd.last_message_at) as last_message_time,
    us.total_unread as unread_count,
    us.unread_wa as unread_whatsapp,
    us.unread_tg as unread_telegram,
    us.unread_max,
    us.unread_email,
    us.unread_calls,
    us.last_messenger as last_unread_messenger
  FROM client_data cd
  JOIN unread_stats us ON us.client_id = cd.id
  LEFT JOIN last_messages lm ON lm.client_id = cd.id
  ORDER BY us.total_unread DESC, lm.last_time DESC NULLS LAST
  LIMIT p_limit;
$$;

-- Обновить кэш PostgREST после создания функции
NOTIFY pgrst, 'reload schema';
