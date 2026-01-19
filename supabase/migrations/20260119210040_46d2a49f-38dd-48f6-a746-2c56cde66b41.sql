-- Fix timeout: simplify teacher exclusion using a materialized approach
-- Instead of complex regex in CTE for every query, use a simpler exclusion pattern

-- 1. Create a helper function to get teacher client IDs (cached result)
CREATE OR REPLACE FUNCTION get_teacher_client_ids()
RETURNS TABLE (client_id UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT DISTINCT c.id
  FROM clients c
  JOIN teachers t ON t.is_active = true AND t.phone IS NOT NULL AND t.phone != ''
  WHERE 
    -- Match by whatsapp_chat_id (most common case, optimized)
    c.whatsapp_chat_id IS NOT NULL 
    AND regexp_replace(c.whatsapp_chat_id, '@.*$', '') = regexp_replace(t.phone, '\D', '', 'g')
$$;

-- 2. Recreate get_chat_threads_optimized with simpler exclusion
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
    -- Exclude teacher clients using simple whatsapp_chat_id pattern match
    AND NOT EXISTS (
      SELECT 1 FROM teachers t 
      WHERE t.is_active = true 
        AND t.phone IS NOT NULL 
        AND t.phone != ''
        AND c.whatsapp_chat_id IS NOT NULL
        AND regexp_replace(c.whatsapp_chat_id, '@.*$', '') = regexp_replace(t.phone, '\D', '', 'g')
    )
  ORDER BY rc.created_at DESC
  LIMIT p_limit;
END;
$$;

-- 3. Recreate get_chat_threads_fast with same optimization
DROP FUNCTION IF EXISTS get_chat_threads_fast(integer);

CREATE FUNCTION get_chat_threads_fast(p_limit INTEGER DEFAULT 100)
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
  recent_messages AS (
    SELECT DISTINCT ON (cm.client_id)
      cm.client_id,
      CASE 
        WHEN cm.message_type = 'system' THEN '📋 Системное сообщение'
        WHEN cm.message_type = 'file' THEN '📎 Файл'
        WHEN cm.message_type = 'image' THEN '🖼 Изображение'
        WHEN cm.message_type = 'voice' THEN '🎤 Голосовое сообщение'
        WHEN cm.message_type = 'video' THEN '🎬 Видео'
        ELSE cm.message_text
      END as message_text,
      cm.created_at,
      cm.messenger_type::TEXT,
      cm.is_outgoing
    FROM chat_messages cm
    WHERE cm.organization_id = v_org_id
    ORDER BY cm.client_id, cm.created_at DESC
  ),
  unread_stats AS (
    SELECT 
      cm.client_id,
      COUNT(*) as cnt,
      MAX(cm.messenger_type::TEXT) as last_messenger
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
    rm.message_text::TEXT AS last_message_text,
    rm.created_at AS last_message_time,
    rm.messenger_type::TEXT AS last_messenger_type,
    CASE WHEN rm.is_outgoing = true THEN 0::BIGINT ELSE COALESCE(us.cnt, 0)::BIGINT END AS unread_count,
    CASE WHEN rm.is_outgoing = true THEN NULL ELSE us.last_messenger::TEXT END AS last_unread_messenger
  FROM recent_messages rm
  JOIN clients c ON c.id = rm.client_id
  LEFT JOIN unread_stats us ON us.client_id = rm.client_id
  WHERE c.organization_id = v_org_id
    AND c.name NOT IN ('Telegram Group', 'Corporate Chat', 'Teachers Chat', 'Communities Chat')
    AND (c.telegram_chat_id IS NULL OR c.telegram_chat_id NOT LIKE '-%')
    -- Exclude teacher clients
    AND NOT EXISTS (
      SELECT 1 FROM teachers t 
      WHERE t.is_active = true 
        AND t.phone IS NOT NULL 
        AND t.phone != ''
        AND c.whatsapp_chat_id IS NOT NULL
        AND regexp_replace(c.whatsapp_chat_id, '@.*$', '') = regexp_replace(t.phone, '\D', '', 'g')
    )
  ORDER BY rm.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_chat_threads_fast(integer) TO authenticated;

-- 4. Recreate get_chat_threads_paginated
DROP FUNCTION IF EXISTS get_chat_threads_paginated(integer, integer);

CREATE FUNCTION get_chat_threads_paginated(p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0)
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
  recent_messages AS (
    SELECT DISTINCT ON (cm.client_id)
      cm.client_id,
      CASE 
        WHEN cm.message_type = 'system' THEN '📋 Системное сообщение'
        WHEN cm.message_type = 'file' THEN '📎 Файл'
        WHEN cm.message_type = 'image' THEN '🖼 Изображение'
        WHEN cm.message_type = 'voice' THEN '🎤 Голосовое сообщение'
        WHEN cm.message_type = 'video' THEN '🎬 Видео'
        ELSE cm.message_text
      END as message_text,
      cm.created_at,
      cm.messenger_type::TEXT,
      cm.is_outgoing
    FROM chat_messages cm
    WHERE cm.organization_id = v_org_id
    ORDER BY cm.client_id, cm.created_at DESC
  ),
  unread_stats AS (
    SELECT 
      cm.client_id,
      COUNT(*) as cnt,
      MAX(cm.messenger_type::TEXT) as last_messenger
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
    rm.message_text::TEXT AS last_message_text,
    rm.created_at AS last_message_time,
    rm.messenger_type::TEXT AS last_messenger_type,
    CASE WHEN rm.is_outgoing = true THEN 0::BIGINT ELSE COALESCE(us.cnt, 0)::BIGINT END AS unread_count,
    CASE WHEN rm.is_outgoing = true THEN NULL ELSE us.last_messenger::TEXT END AS last_unread_messenger
  FROM recent_messages rm
  JOIN clients c ON c.id = rm.client_id
  LEFT JOIN unread_stats us ON us.client_id = rm.client_id
  WHERE c.organization_id = v_org_id
    AND c.name NOT IN ('Telegram Group', 'Corporate Chat', 'Teachers Chat', 'Communities Chat')
    AND (c.telegram_chat_id IS NULL OR c.telegram_chat_id NOT LIKE '-%')
    AND NOT EXISTS (
      SELECT 1 FROM teachers t 
      WHERE t.is_active = true 
        AND t.phone IS NOT NULL 
        AND t.phone != ''
        AND c.whatsapp_chat_id IS NOT NULL
        AND regexp_replace(c.whatsapp_chat_id, '@.*$', '') = regexp_replace(t.phone, '\D', '', 'g')
    )
  ORDER BY rm.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_chat_threads_paginated(integer, integer) TO authenticated;

-- 5. Recreate get_unread_chat_threads
DROP FUNCTION IF EXISTS get_unread_chat_threads(integer);

CREATE FUNCTION get_unread_chat_threads(p_limit INTEGER DEFAULT 100)
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
  unread_clients AS (
    SELECT DISTINCT cm.client_id
    FROM chat_messages cm
    WHERE cm.organization_id = v_org_id
      AND cm.is_read = false
      AND cm.is_outgoing = false
  ),
  recent_messages AS (
    SELECT DISTINCT ON (cm.client_id)
      cm.client_id,
      CASE 
        WHEN cm.message_type = 'system' THEN '📋 Системное сообщение'
        WHEN cm.message_type = 'file' THEN '📎 Файл'
        WHEN cm.message_type = 'image' THEN '🖼 Изображение'
        WHEN cm.message_type = 'voice' THEN '🎤 Голосовое сообщение'
        WHEN cm.message_type = 'video' THEN '🎬 Видео'
        ELSE cm.message_text
      END as message_text,
      cm.created_at,
      cm.messenger_type::TEXT,
      cm.is_outgoing
    FROM chat_messages cm
    WHERE cm.organization_id = v_org_id
      AND cm.client_id IN (SELECT client_id FROM unread_clients)
    ORDER BY cm.client_id, cm.created_at DESC
  ),
  unread_stats AS (
    SELECT 
      cm.client_id,
      COUNT(*) as cnt,
      MAX(cm.messenger_type::TEXT) as last_messenger
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
    rm.message_text::TEXT AS last_message_text,
    rm.created_at AS last_message_time,
    rm.messenger_type::TEXT AS last_messenger_type,
    CASE WHEN rm.is_outgoing = true THEN 0::BIGINT ELSE COALESCE(us.cnt, 0)::BIGINT END AS unread_count,
    CASE WHEN rm.is_outgoing = true THEN NULL ELSE us.last_messenger::TEXT END AS last_unread_messenger
  FROM recent_messages rm
  JOIN clients c ON c.id = rm.client_id
  LEFT JOIN unread_stats us ON us.client_id = rm.client_id
  WHERE c.organization_id = v_org_id
    AND c.name NOT IN ('Telegram Group', 'Corporate Chat', 'Teachers Chat', 'Communities Chat')
    AND (c.telegram_chat_id IS NULL OR c.telegram_chat_id NOT LIKE '-%')
    AND NOT EXISTS (
      SELECT 1 FROM teachers t 
      WHERE t.is_active = true 
        AND t.phone IS NOT NULL 
        AND t.phone != ''
        AND c.whatsapp_chat_id IS NOT NULL
        AND regexp_replace(c.whatsapp_chat_id, '@.*$', '') = regexp_replace(t.phone, '\D', '', 'g')
    )
    AND rm.is_outgoing = false
  ORDER BY rm.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_unread_chat_threads(integer) TO authenticated;