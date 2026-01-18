
-- Fix unread_count logic: if last message is outgoing, chat is always "read"

-- Drop and recreate get_chat_threads_fast with fixed logic
DROP FUNCTION IF EXISTS get_chat_threads_fast(integer);

CREATE FUNCTION get_chat_threads_fast(p_limit INTEGER DEFAULT 100)
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
  WITH recent_clients AS (
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
      COUNT(*) FILTER (WHERE cm.messenger_type = 'whatsapp') AS wa_cnt,
      COUNT(*) FILTER (WHERE cm.messenger_type = 'telegram') AS tg_cnt,
      COUNT(*) FILTER (WHERE cm.messenger_type = 'max') AS max_cnt,
      COUNT(*) FILTER (WHERE cm.messenger_type = 'email') AS email_cnt,
      COUNT(*) FILTER (WHERE cm.messenger_type = 'call') AS call_cnt,
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
    c.branch::TEXT AS client_branch,
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
    -- If last message is outgoing (from us), chat is always "read" = 0 unread
    CASE WHEN rc.is_outgoing = true THEN 0::BIGINT ELSE COALESCE(us.cnt, 0)::BIGINT END AS unread_count,
    CASE WHEN rc.is_outgoing = true THEN 0::BIGINT ELSE COALESCE(us.wa_cnt, 0)::BIGINT END AS unread_whatsapp,
    CASE WHEN rc.is_outgoing = true THEN 0::BIGINT ELSE COALESCE(us.tg_cnt, 0)::BIGINT END AS unread_telegram,
    CASE WHEN rc.is_outgoing = true THEN 0::BIGINT ELSE COALESCE(us.max_cnt, 0)::BIGINT END AS unread_max,
    CASE WHEN rc.is_outgoing = true THEN 0::BIGINT ELSE COALESCE(us.email_cnt, 0)::BIGINT END AS unread_email,
    CASE WHEN rc.is_outgoing = true THEN 0::BIGINT ELSE COALESCE(us.call_cnt, 0)::BIGINT END AS unread_calls,
    CASE WHEN rc.is_outgoing = true THEN NULL ELSE us.last_messenger::TEXT END AS last_unread_messenger
  FROM recent_clients rc
  JOIN clients c ON c.id = rc.cid
  LEFT JOIN unread_stats us ON us.cid = rc.cid
  WHERE c.organization_id = v_org_id
    AND c.name NOT IN ('Telegram Group', 'Corporate Chat', 'Teachers Chat', 'Communities Chat')
    AND (c.telegram_chat_id IS NULL OR c.telegram_chat_id NOT LIKE '-%')
  ORDER BY rc.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Fix get_chat_threads_optimized (same signature, just add is_outgoing check)
CREATE OR REPLACE FUNCTION get_chat_threads_optimized(p_limit INTEGER DEFAULT 200)
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
  WITH recent_clients AS (
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
    -- If last message is outgoing (from us), chat is always "read" = 0 unread
    CASE WHEN rc.is_outgoing = true THEN 0::BIGINT ELSE COALESCE(us.cnt, 0)::BIGINT END AS unread_count,
    CASE WHEN rc.is_outgoing = true THEN NULL ELSE us.last_messenger::TEXT END AS last_unread_messenger
  FROM recent_clients rc
  JOIN clients c ON c.id = rc.cid
  LEFT JOIN unread_stats us ON us.cid = rc.cid
  WHERE c.organization_id = v_org_id
    AND c.name NOT IN ('Telegram Group', 'Corporate Chat', 'Teachers Chat', 'Communities Chat')
    AND (c.telegram_chat_id IS NULL OR c.telegram_chat_id NOT LIKE '-%')
  ORDER BY rc.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Fix get_chat_threads_by_client_ids (same logic)
CREATE OR REPLACE FUNCTION get_chat_threads_by_client_ids(p_client_ids UUID[])
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
  WITH recent_messages AS (
    SELECT DISTINCT ON (cm.client_id) 
      cm.client_id AS cid,
      cm.message_text,
      cm.created_at,
      cm.messenger_type::TEXT,
      cm.is_outgoing
    FROM chat_messages cm
    WHERE cm.client_id = ANY(p_client_ids)
      AND cm.organization_id = v_org_id
    ORDER BY cm.client_id, cm.created_at DESC
  ),
  unread_stats AS (
    SELECT 
      cm.client_id AS cid,
      COUNT(*) AS cnt,
      MAX(cm.messenger_type::TEXT) AS last_messenger
    FROM chat_messages cm
    WHERE cm.client_id = ANY(p_client_ids)
      AND cm.organization_id = v_org_id
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
    rm.message_text::TEXT AS last_message_text,
    rm.created_at AS last_message_time,
    rm.messenger_type::TEXT AS last_messenger_type,
    -- If last message is outgoing, chat is always "read"
    CASE WHEN rm.is_outgoing = true THEN 0::BIGINT ELSE COALESCE(us.cnt, 0)::BIGINT END AS unread_count,
    CASE WHEN rm.is_outgoing = true THEN NULL ELSE us.last_messenger::TEXT END AS last_unread_messenger
  FROM clients c
  JOIN recent_messages rm ON rm.cid = c.id
  LEFT JOIN unread_stats us ON us.cid = c.id
  WHERE c.id = ANY(p_client_ids)
    AND c.organization_id = v_org_id
  ORDER BY rm.created_at DESC;
END;
$$;
