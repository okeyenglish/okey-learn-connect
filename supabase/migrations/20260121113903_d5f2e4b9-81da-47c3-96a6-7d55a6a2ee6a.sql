
-- Fix get_chat_threads_optimized to properly exclude teacher clients using teacher_client_links table
CREATE OR REPLACE FUNCTION get_chat_threads_optimized(
  p_search TEXT DEFAULT NULL,
  p_unread_only BOOLEAN DEFAULT FALSE,
  p_archived BOOLEAN DEFAULT FALSE,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
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
  WITH 
  -- Get client IDs linked to active teachers (using cached table)
  teacher_client_ids AS (
    SELECT tcl.client_id
    FROM teacher_client_links tcl
    JOIN teachers t ON t.id = tcl.teacher_id AND t.is_active = true
  ),
  recent_clients AS (
    SELECT DISTINCT ON (cm.client_id) 
      cm.client_id AS cid,
      cm.message_text,
      cm.created_at,
      cm.messenger_type::TEXT,
      cm.is_outgoing
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
    CASE WHEN rc.is_outgoing = true THEN 0::BIGINT ELSE COALESCE(us.cnt, 0)::BIGINT END AS unread_count,
    CASE WHEN rc.is_outgoing = true THEN NULL ELSE us.last_messenger::TEXT END AS last_unread_messenger
  FROM recent_clients rc
  JOIN clients c ON c.id = rc.cid
  LEFT JOIN unread_stats us ON us.cid = rc.cid
  WHERE c.organization_id = v_org_id
    AND c.is_active = true
    AND c.name NOT IN ('Telegram Group', 'Corporate Chat', 'Teachers Chat', 'Communities Chat')
    AND (c.telegram_chat_id IS NULL OR c.telegram_chat_id NOT LIKE '-%')
    -- Exclude clients linked to active teachers using cached table
    AND c.id NOT IN (SELECT client_id FROM teacher_client_ids)
    -- Apply search filter if provided
    AND (
      p_search IS NULL 
      OR p_search = ''
      OR c.name ILIKE '%' || p_search || '%'
      OR c.phone ILIKE '%' || p_search || '%'
    )
    -- Apply unread filter if requested
    AND (
      p_unread_only = FALSE 
      OR (rc.is_outgoing = false AND COALESCE(us.cnt, 0) > 0)
    )
  ORDER BY rc.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
