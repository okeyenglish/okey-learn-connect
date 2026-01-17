-- Fix the get_chat_threads_optimized function to properly order by last message time
DROP FUNCTION IF EXISTS get_chat_threads_optimized(integer);

CREATE OR REPLACE FUNCTION get_chat_threads_optimized(p_limit integer DEFAULT 200)
RETURNS TABLE (
  client_id uuid,
  client_name text,
  client_phone text,
  client_branch text,
  avatar_url text,
  telegram_avatar_url text,
  whatsapp_avatar_url text,
  max_avatar_url text,
  telegram_chat_id text,
  last_message text,
  last_message_time timestamptz,
  unread_count bigint,
  unread_whatsapp bigint,
  unread_telegram bigint,
  unread_max bigint,
  unread_email bigint,
  unread_calls bigint,
  last_unread_messenger text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH client_last_msg AS (
    -- Get last message time for each active client
    SELECT 
      cm.client_id,
      MAX(cm.created_at) as last_msg_time
    FROM chat_messages cm
    JOIN clients c ON c.id = cm.client_id AND c.is_active = true
    GROUP BY cm.client_id
    ORDER BY last_msg_time DESC
    LIMIT p_limit
  ),
  recent_clients AS (
    -- Get client details with last message
    SELECT DISTINCT ON (clm.client_id)
      clm.client_id,
      c.name as client_name,
      c.phone as client_phone,
      c.branch as client_branch,
      c.avatar_url,
      c.telegram_avatar_url,
      c.whatsapp_avatar_url,
      c.max_avatar_url,
      c.telegram_chat_id,
      cm.message_text as last_message,
      cm.created_at as last_message_time
    FROM client_last_msg clm
    JOIN clients c ON c.id = clm.client_id
    JOIN chat_messages cm ON cm.client_id = clm.client_id
    ORDER BY clm.client_id, cm.created_at DESC
  ),
  unread_stats AS (
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
    rc.client_branch,
    rc.avatar_url,
    rc.telegram_avatar_url,
    rc.whatsapp_avatar_url,
    rc.max_avatar_url,
    rc.telegram_chat_id,
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