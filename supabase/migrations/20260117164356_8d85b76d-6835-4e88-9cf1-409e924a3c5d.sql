-- Revert get_chat_threads_optimized to FAST version (only recent chats by time)
-- Unread chats will be loaded separately via get_chat_threads_by_client_ids
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
  WITH 
  -- Get recent clients by last message time (FAST - uses index)
  recent_clients AS (
    SELECT DISTINCT ON (c.id)
      c.id as client_id,
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
    FROM clients c
    JOIN LATERAL (
      SELECT message_text, created_at
      FROM chat_messages
      WHERE client_id = c.id
      ORDER BY created_at DESC
      LIMIT 1
    ) cm ON true
    WHERE c.is_active = true
    ORDER BY c.id, cm.created_at DESC
  ),
  -- Sort and limit
  sorted_clients AS (
    SELECT * FROM recent_clients
    ORDER BY last_message_time DESC
    LIMIT p_limit
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
    WHERE cm.client_id IN (SELECT sc.client_id FROM sorted_clients sc)
      AND cm.is_read = false AND cm.message_type = 'client'
    GROUP BY cm.client_id
  ),
  last_unread AS (
    SELECT DISTINCT ON (cm.client_id)
      cm.client_id,
      cm.messenger_type::TEXT as last_unread_messenger
    FROM chat_messages cm
    WHERE cm.client_id IN (SELECT sc.client_id FROM sorted_clients sc)
      AND cm.is_read = false 
      AND cm.message_type = 'client'
    ORDER BY cm.client_id, cm.created_at DESC
  ),
  missed_calls AS (
    SELECT 
      cl.client_id,
      COUNT(*) as unread_calls
    FROM call_logs cl
    WHERE cl.client_id IN (SELECT sc.client_id FROM sorted_clients sc)
      AND cl.status = 'missed'
    GROUP BY cl.client_id
  )
  SELECT 
    sc.client_id,
    sc.client_name,
    sc.client_phone,
    sc.client_branch,
    sc.avatar_url,
    sc.telegram_avatar_url,
    sc.whatsapp_avatar_url,
    sc.max_avatar_url,
    sc.telegram_chat_id,
    sc.last_message,
    sc.last_message_time,
    COALESCE(us.unread_count, 0) as unread_count,
    COALESCE(us.unread_whatsapp, 0) as unread_whatsapp,
    COALESCE(us.unread_telegram, 0) as unread_telegram,
    COALESCE(us.unread_max, 0) as unread_max,
    COALESCE(us.unread_email, 0) as unread_email,
    COALESCE(mc.unread_calls, 0) as unread_calls,
    lu.last_unread_messenger
  FROM sorted_clients sc
  LEFT JOIN unread_stats us ON us.client_id = sc.client_id
  LEFT JOIN last_unread lu ON lu.client_id = sc.client_id
  LEFT JOIN missed_calls mc ON mc.client_id = sc.client_id
  ORDER BY sc.last_message_time DESC;
END;
$$;

-- NEW: Function to get chat threads by specific client IDs (for loading missing unread chats)
CREATE OR REPLACE FUNCTION get_chat_threads_by_client_ids(p_client_ids uuid[])
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
  -- Early return if no client IDs provided
  IF array_length(p_client_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH 
  target_clients AS (
    SELECT DISTINCT ON (c.id)
      c.id as client_id,
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
    FROM clients c
    JOIN LATERAL (
      SELECT message_text, created_at
      FROM chat_messages
      WHERE client_id = c.id
      ORDER BY created_at DESC
      LIMIT 1
    ) cm ON true
    WHERE c.id = ANY(p_client_ids)
      AND c.is_active = true
    ORDER BY c.id, cm.created_at DESC
  ),
  unread_stats AS (
    SELECT 
      cm.client_id,
      COUNT(*) as unread_count,
      COUNT(*) FILTER (WHERE cm.messenger_type = 'whatsapp') as unread_whatsapp,
      COUNT(*) FILTER (WHERE cm.messenger_type = 'telegram') as unread_telegram,
      COUNT(*) FILTER (WHERE cm.messenger_type = 'max') as unread_max,
      COUNT(*) FILTER (WHERE cm.messenger_type = 'email') as unread_email
    FROM chat_messages cm
    WHERE cm.client_id = ANY(p_client_ids)
      AND cm.is_read = false 
      AND cm.message_type = 'client'
    GROUP BY cm.client_id
  ),
  last_unread AS (
    SELECT DISTINCT ON (cm.client_id)
      cm.client_id,
      cm.messenger_type::TEXT as last_unread_messenger
    FROM chat_messages cm
    WHERE cm.client_id = ANY(p_client_ids)
      AND cm.is_read = false 
      AND cm.message_type = 'client'
    ORDER BY cm.client_id, cm.created_at DESC
  ),
  missed_calls AS (
    SELECT 
      cl.client_id,
      COUNT(*) as unread_calls
    FROM call_logs cl
    WHERE cl.client_id = ANY(p_client_ids)
      AND cl.status = 'missed'
    GROUP BY cl.client_id
  )
  SELECT 
    tc.client_id,
    tc.client_name,
    tc.client_phone,
    tc.client_branch,
    tc.avatar_url,
    tc.telegram_avatar_url,
    tc.whatsapp_avatar_url,
    tc.max_avatar_url,
    tc.telegram_chat_id,
    tc.last_message,
    tc.last_message_time,
    COALESCE(us.unread_count, 0) as unread_count,
    COALESCE(us.unread_whatsapp, 0) as unread_whatsapp,
    COALESCE(us.unread_telegram, 0) as unread_telegram,
    COALESCE(us.unread_max, 0) as unread_max,
    COALESCE(us.unread_email, 0) as unread_email,
    COALESCE(mc.unread_calls, 0) as unread_calls,
    lu.last_unread_messenger
  FROM target_clients tc
  LEFT JOIN unread_stats us ON us.client_id = tc.client_id
  LEFT JOIN last_unread lu ON lu.client_id = tc.client_id
  LEFT JOIN missed_calls mc ON mc.client_id = tc.client_id
  ORDER BY tc.last_message_time DESC;
END;
$$;