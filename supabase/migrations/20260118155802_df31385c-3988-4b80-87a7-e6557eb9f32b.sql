-- Fix ambiguous client_id error by renaming output parameter to clt_id

-- Drop existing functions first
DROP FUNCTION IF EXISTS get_chat_threads_fast(integer);
DROP FUNCTION IF EXISTS get_chat_threads_optimized(integer);

-- Recreate get_chat_threads_fast with fixed parameter name
CREATE OR REPLACE FUNCTION get_chat_threads_fast(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  clt_id UUID,
  client_name TEXT,
  client_avatar TEXT,
  last_message TEXT,
  last_message_time TIMESTAMPTZ,
  last_messenger TEXT,
  unread_count BIGINT,
  is_outgoing BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Get organization_id for current user
  SELECT organization_id INTO v_org_id
  FROM teachers
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH recent_clients AS (
    -- First get recent client IDs with their last message time (uses index)
    SELECT 
      cm.client_id as cid,
      MAX(cm.created_at) as last_time
    FROM chat_messages cm
    WHERE cm.organization_id = v_org_id
    GROUP BY cm.client_id
    ORDER BY last_time DESC
    LIMIT p_limit
  ),
  last_messages AS (
    -- Get last message for each recent client
    SELECT DISTINCT ON (cm.client_id)
      cm.client_id as cid,
      cm.message_text,
      cm.created_at,
      cm.messenger_type,
      cm.is_outgoing
    FROM chat_messages cm
    INNER JOIN recent_clients rc ON rc.cid = cm.client_id
    WHERE cm.organization_id = v_org_id
    ORDER BY cm.client_id, cm.created_at DESC
  ),
  unread_counts AS (
    -- Count unread messages for recent clients
    SELECT 
      cm.client_id as cid,
      COUNT(*) as cnt
    FROM chat_messages cm
    INNER JOIN recent_clients rc ON rc.cid = cm.client_id
    WHERE cm.organization_id = v_org_id
      AND cm.is_read = false
      AND cm.message_type = 'client'
    GROUP BY cm.client_id
  )
  SELECT
    c.id as clt_id,
    c.name as client_name,
    COALESCE(c.avatar_url, c.telegram_avatar_url, c.whatsapp_avatar_url, c.max_avatar_url) as client_avatar,
    lm.message_text as last_message,
    lm.created_at as last_message_time,
    lm.messenger_type::TEXT as last_messenger,
    COALESCE(uc.cnt, 0) as unread_count,
    COALESCE(lm.is_outgoing, false) as is_outgoing
  FROM recent_clients rc
  INNER JOIN clients c ON c.id = rc.cid
  LEFT JOIN last_messages lm ON lm.cid = rc.cid
  LEFT JOIN unread_counts uc ON uc.cid = rc.cid
  WHERE c.name NOT LIKE '%[TG Group]%'
    AND c.name NOT LIKE '%[Групповой чат]%'
    AND c.name NOT LIKE '%[Системный чат]%'
  ORDER BY rc.last_time DESC;
END;
$$;

-- Recreate get_chat_threads_optimized with fixed parameter name
CREATE OR REPLACE FUNCTION get_chat_threads_optimized(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  clt_id UUID,
  client_name TEXT,
  client_avatar TEXT,
  last_message TEXT,
  last_message_time TIMESTAMPTZ,
  last_messenger TEXT,
  unread_count BIGINT,
  is_outgoing BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Get organization_id for current user
  SELECT organization_id INTO v_org_id
  FROM teachers
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH recent_clients AS (
    -- First get recent client IDs with their last message time (uses index)
    SELECT 
      cm.client_id as cid,
      MAX(cm.created_at) as last_time
    FROM chat_messages cm
    WHERE cm.organization_id = v_org_id
    GROUP BY cm.client_id
    ORDER BY last_time DESC
    LIMIT p_limit
  ),
  last_messages AS (
    -- Get last message for each recent client
    SELECT DISTINCT ON (cm.client_id)
      cm.client_id as cid,
      cm.message_text,
      cm.created_at,
      cm.messenger_type,
      cm.is_outgoing
    FROM chat_messages cm
    INNER JOIN recent_clients rc ON rc.cid = cm.client_id
    WHERE cm.organization_id = v_org_id
    ORDER BY cm.client_id, cm.created_at DESC
  ),
  unread_counts AS (
    -- Count unread messages for recent clients
    SELECT 
      cm.client_id as cid,
      COUNT(*) as cnt
    FROM chat_messages cm
    INNER JOIN recent_clients rc ON rc.cid = cm.client_id
    WHERE cm.organization_id = v_org_id
      AND cm.is_read = false
      AND cm.message_type = 'client'
    GROUP BY cm.client_id
  )
  SELECT
    c.id as clt_id,
    c.name as client_name,
    COALESCE(c.avatar_url, c.telegram_avatar_url, c.whatsapp_avatar_url, c.max_avatar_url) as client_avatar,
    lm.message_text as last_message,
    lm.created_at as last_message_time,
    lm.messenger_type::TEXT as last_messenger,
    COALESCE(uc.cnt, 0) as unread_count,
    COALESCE(lm.is_outgoing, false) as is_outgoing
  FROM recent_clients rc
  INNER JOIN clients c ON c.id = rc.cid
  LEFT JOIN last_messages lm ON lm.cid = rc.cid
  LEFT JOIN unread_counts uc ON uc.cid = rc.cid
  WHERE c.name NOT LIKE '%[TG Group]%'
    AND c.name NOT LIKE '%[Групповой чат]%'
    AND c.name NOT LIKE '%[Системный чат]%'
  ORDER BY rc.last_time DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_chat_threads_fast(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_chat_threads_optimized(integer) TO authenticated;