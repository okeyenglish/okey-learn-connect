
-- Update get_chat_threads_optimized to exclude teacher-linked clients
CREATE OR REPLACE FUNCTION get_chat_threads_optimized(p_limit INT DEFAULT 200)
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
  WITH 
  -- Get all client IDs that are linked to teachers (to exclude them)
  teacher_client_ids AS (
    SELECT DISTINCT c.id
    FROM clients c
    JOIN teachers t ON (
      -- Match by normalized phone
      regexp_replace(c.phone, '\D', '', 'g') = regexp_replace(t.phone, '\D', '', 'g')
      -- Match by whatsapp_chat_id (remove @c.us suffix)
      OR regexp_replace(c.whatsapp_chat_id, '@.*$', '') = regexp_replace(t.phone, '\D', '', 'g')
      -- Match with 8 -> 7 conversion
      OR regexp_replace(c.whatsapp_chat_id, '@.*$', '') = '7' || substring(regexp_replace(t.phone, '\D', '', 'g') from 2)
      -- Match by telegram_chat_id
      OR c.telegram_chat_id = regexp_replace(t.phone, '\D', '', 'g')
      -- Match by max_chat_id
      OR c.max_chat_id = regexp_replace(t.phone, '\D', '', 'g')
    )
    WHERE t.is_active = true
      AND t.phone IS NOT NULL 
      AND t.phone != ''
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
    AND c.name NOT IN ('Telegram Group', 'Corporate Chat', 'Teachers Chat', 'Communities Chat')
    AND (c.telegram_chat_id IS NULL OR c.telegram_chat_id NOT LIKE '-%')
    -- Exclude clients linked to teachers
    AND c.id NOT IN (SELECT id FROM teacher_client_ids)
  ORDER BY rc.created_at DESC
  LIMIT p_limit;
END;
$$;
