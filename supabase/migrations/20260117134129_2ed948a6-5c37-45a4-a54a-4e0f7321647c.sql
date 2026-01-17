-- Создаем оптимизированную RPC функцию для быстрой загрузки чатов
-- Фикс: возвращаем TEXT вместо messenger_type enum для last_unread_messenger
CREATE OR REPLACE FUNCTION public.get_chat_threads_optimized(p_limit INT DEFAULT 200)
RETURNS TABLE(
  client_id UUID,
  client_name TEXT,
  client_phone TEXT,
  last_message TEXT,
  last_message_time TIMESTAMPTZ,
  unread_count BIGINT,
  unread_whatsapp BIGINT,
  unread_telegram BIGINT,
  unread_max BIGINT,
  unread_email BIGINT,
  unread_calls BIGINT,
  last_unread_messenger TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH recent_clients AS (
    -- Получаем последнее сообщение для каждого клиента используя DISTINCT ON
    SELECT DISTINCT ON (cm.client_id)
      cm.client_id,
      c.name as client_name,
      c.phone as client_phone,
      cm.message_text as last_message,
      cm.created_at as last_message_time
    FROM chat_messages cm
    JOIN clients c ON c.id = cm.client_id
    WHERE c.is_active = true
    ORDER BY cm.client_id, cm.created_at DESC
    LIMIT p_limit
  ),
  unread_stats AS (
    -- Считаем непрочитанные по мессенджерам одним запросом
    SELECT 
      cm.client_id,
      COUNT(*) FILTER (WHERE cm.is_read = false AND cm.message_type = 'client') as unread_count,
      COUNT(*) FILTER (WHERE cm.is_read = false AND cm.message_type = 'client' AND cm.messenger_type = 'whatsapp') as unread_whatsapp,
      COUNT(*) FILTER (WHERE cm.is_read = false AND cm.message_type = 'client' AND cm.messenger_type = 'telegram') as unread_telegram,
      COUNT(*) FILTER (WHERE cm.is_read = false AND cm.message_type = 'client' AND cm.messenger_type = 'max') as unread_max,
      COUNT(*) FILTER (WHERE cm.is_read = false AND cm.message_type = 'client' AND cm.messenger_type = 'email') as unread_email
    FROM chat_messages cm
    WHERE cm.client_id IN (SELECT rc.client_id FROM recent_clients rc)
    GROUP BY cm.client_id
  ),
  last_unread AS (
    -- Находим последний мессенджер с непрочитанными
    SELECT DISTINCT ON (cm.client_id)
      cm.client_id,
      cm.messenger_type::TEXT as last_unread_messenger
    FROM chat_messages cm
    WHERE cm.client_id IN (SELECT rc.client_id FROM recent_clients rc)
      AND cm.is_read = false 
      AND cm.message_type = 'client'
    ORDER BY cm.client_id, cm.created_at DESC
  ),
  missed_calls AS (
    -- Считаем пропущенные звонки
    SELECT 
      cl.client_id,
      COUNT(*) as unread_calls
    FROM call_logs cl
    WHERE cl.client_id IN (SELECT rc.client_id FROM recent_clients rc)
      AND cl.status = 'missed'
    GROUP BY cl.client_id
  )
  SELECT 
    rc.client_id,
    rc.client_name,
    rc.client_phone,
    rc.last_message,
    rc.last_message_time,
    COALESCE(us.unread_count, 0) as unread_count,
    COALESCE(us.unread_whatsapp, 0) as unread_whatsapp,
    COALESCE(us.unread_telegram, 0) as unread_telegram,
    COALESCE(us.unread_max, 0) as unread_max,
    COALESCE(us.unread_email, 0) as unread_email,
    COALESCE(mc.unread_calls, 0) as unread_calls,
    lu.last_unread_messenger
  FROM recent_clients rc
  LEFT JOIN unread_stats us ON us.client_id = rc.client_id
  LEFT JOIN last_unread lu ON lu.client_id = rc.client_id
  LEFT JOIN missed_calls mc ON mc.client_id = rc.client_id
  ORDER BY rc.last_message_time DESC;
END;
$$;

-- Даем права на выполнение
GRANT EXECUTE ON FUNCTION public.get_chat_threads_optimized(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_chat_threads_optimized(INT) TO anon;