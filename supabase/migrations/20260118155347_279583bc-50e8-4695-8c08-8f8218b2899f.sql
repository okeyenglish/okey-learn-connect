
-- Step 1: Add 'salebot' to messenger_type enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = 'messenger_type'::regtype 
    AND enumlabel = 'salebot'
  ) THEN
    ALTER TYPE messenger_type ADD VALUE 'salebot';
  END IF;
END $$;

-- Step 2: Create optimized index for unread messages (includes organization_id)
CREATE INDEX IF NOT EXISTS idx_chat_messages_org_client_unread 
ON chat_messages (organization_id, client_id, created_at DESC) 
WHERE is_read = false AND message_type = 'client';

-- Step 3: Drop existing functions to allow return type change
DROP FUNCTION IF EXISTS get_chat_threads_fast(integer);
DROP FUNCTION IF EXISTS get_chat_threads_optimized(integer);

-- Step 4: Optimize get_chat_threads_fast - more efficient query with limits early
CREATE OR REPLACE FUNCTION get_chat_threads_fast(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  client_phone TEXT,
  client_branch TEXT,
  avatar_url TEXT,
  telegram_avatar_url TEXT,
  whatsapp_avatar_url TEXT,
  max_avatar_url TEXT,
  telegram_chat_id TEXT,
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
DECLARE
  v_org_id UUID;
BEGIN
  -- Get user's organization
  SELECT get_user_organization_id() INTO v_org_id;
  
  RETURN QUERY
  WITH 
  -- FAST: Get recent client_ids with last message time using index
  recent_activity AS (
    SELECT 
      cm.client_id,
      MAX(cm.created_at) as last_time
    FROM chat_messages cm
    WHERE cm.organization_id = v_org_id
    GROUP BY cm.client_id
    ORDER BY last_time DESC
    LIMIT p_limit
  ),
  -- Get last message for each client
  last_messages AS (
    SELECT DISTINCT ON (cm.client_id)
      cm.client_id,
      cm.message_text,
      cm.created_at
    FROM chat_messages cm
    WHERE cm.client_id IN (SELECT ra.client_id FROM recent_activity ra)
    ORDER BY cm.client_id, cm.created_at DESC
  ),
  -- Count unreads for these clients only
  unread_stats AS (
    SELECT 
      cm.client_id,
      COUNT(*) as unread_count,
      COUNT(*) FILTER (WHERE cm.messenger_type = 'whatsapp'::messenger_type) as unread_whatsapp,
      COUNT(*) FILTER (WHERE cm.messenger_type = 'telegram'::messenger_type) as unread_telegram,
      COUNT(*) FILTER (WHERE cm.messenger_type = 'max'::messenger_type) as unread_max,
      COUNT(*) FILTER (WHERE cm.messenger_type = 'email'::messenger_type) as unread_email
    FROM chat_messages cm
    WHERE cm.client_id IN (SELECT ra.client_id FROM recent_activity ra)
      AND cm.is_read = false 
      AND cm.message_type = 'client'
    GROUP BY cm.client_id
  ),
  -- Get last unread messenger
  last_unread AS (
    SELECT DISTINCT ON (cm.client_id)
      cm.client_id,
      cm.messenger_type::TEXT as last_unread_messenger
    FROM chat_messages cm
    WHERE cm.client_id IN (SELECT ra.client_id FROM recent_activity ra)
      AND cm.is_read = false 
      AND cm.message_type = 'client'
    ORDER BY cm.client_id, cm.created_at DESC
  ),
  -- Missed calls
  missed_calls AS (
    SELECT 
      cl.client_id,
      COUNT(*) as unread_calls
    FROM call_logs cl
    WHERE cl.client_id IN (SELECT ra.client_id FROM recent_activity ra)
      AND cl.status = 'missed'
    GROUP BY cl.client_id
  )
  SELECT 
    c.id as client_id,
    c.name::TEXT as client_name,
    COALESCE(c.phone, cpn.phone, '')::TEXT as client_phone,
    c.branch::TEXT as client_branch,
    c.avatar_url::TEXT,
    c.telegram_avatar_url::TEXT,
    c.whatsapp_avatar_url::TEXT,
    c.max_avatar_url::TEXT,
    c.telegram_chat_id::TEXT,
    COALESCE(lm.message_text, '')::TEXT as last_message,
    lm.created_at as last_message_time,
    COALESCE(us.unread_count, 0) as unread_count,
    COALESCE(us.unread_whatsapp, 0) as unread_whatsapp,
    COALESCE(us.unread_telegram, 0) as unread_telegram,
    COALESCE(us.unread_max, 0) as unread_max,
    COALESCE(us.unread_email, 0) as unread_email,
    COALESCE(mc.unread_calls, 0) as unread_calls,
    lu.last_unread_messenger::TEXT
  FROM recent_activity ra
  JOIN clients c ON c.id = ra.client_id
  LEFT JOIN client_phone_numbers cpn ON cpn.client_id = c.id AND cpn.is_primary = true
  LEFT JOIN last_messages lm ON lm.client_id = c.id
  LEFT JOIN unread_stats us ON us.client_id = c.id
  LEFT JOIN last_unread lu ON lu.client_id = c.id
  LEFT JOIN missed_calls mc ON mc.client_id = c.id
  WHERE c.is_active = true
  ORDER BY lm.created_at DESC NULLS LAST;
END;
$$;

-- Step 5: Optimize get_chat_threads_optimized - fix ambiguous client_id
CREATE OR REPLACE FUNCTION get_chat_threads_optimized(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  client_phone TEXT,
  client_branch TEXT,
  avatar_url TEXT,
  telegram_avatar_url TEXT,
  whatsapp_avatar_url TEXT,
  max_avatar_url TEXT,
  telegram_chat_id TEXT,
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
DECLARE
  v_org_id UUID;
BEGIN
  -- Get user's organization
  SELECT get_user_organization_id() INTO v_org_id;
  
  RETURN QUERY
  WITH 
  -- FAST: Get recent client_ids using index on (organization_id, created_at DESC)
  recent_client_times AS (
    SELECT 
      cm.client_id as cid,
      MAX(cm.created_at) as last_time
    FROM chat_messages cm
    WHERE cm.organization_id = v_org_id
    GROUP BY cm.client_id
    ORDER BY MAX(cm.created_at) DESC
    LIMIT p_limit
  ),
  -- Get last message for each client
  last_messages AS (
    SELECT DISTINCT ON (cm.client_id)
      cm.client_id as cid,
      cm.message_text,
      cm.created_at
    FROM chat_messages cm
    WHERE cm.client_id IN (SELECT rct.cid FROM recent_client_times rct)
    ORDER BY cm.client_id, cm.created_at DESC
  ),
  -- Count unreads for these clients only
  unread_stats AS (
    SELECT 
      cm.client_id as cid,
      COUNT(*) as unread_count,
      COUNT(*) FILTER (WHERE cm.messenger_type = 'whatsapp'::messenger_type) as unread_whatsapp,
      COUNT(*) FILTER (WHERE cm.messenger_type = 'telegram'::messenger_type) as unread_telegram,
      COUNT(*) FILTER (WHERE cm.messenger_type = 'max'::messenger_type) as unread_max,
      COUNT(*) FILTER (WHERE cm.messenger_type = 'email'::messenger_type) as unread_email
    FROM chat_messages cm
    WHERE cm.client_id IN (SELECT rct.cid FROM recent_client_times rct)
      AND cm.is_read = false 
      AND cm.message_type = 'client'
    GROUP BY cm.client_id
  ),
  -- Get last unread messenger
  last_unread AS (
    SELECT DISTINCT ON (cm.client_id)
      cm.client_id as cid,
      cm.messenger_type::TEXT as last_unread_messenger
    FROM chat_messages cm
    WHERE cm.client_id IN (SELECT rct.cid FROM recent_client_times rct)
      AND cm.is_read = false 
      AND cm.message_type = 'client'
    ORDER BY cm.client_id, cm.created_at DESC
  ),
  -- Missed calls
  missed_calls AS (
    SELECT 
      cl.client_id as cid,
      COUNT(*) as unread_calls
    FROM call_logs cl
    WHERE cl.client_id IN (SELECT rct.cid FROM recent_client_times rct)
      AND cl.status = 'missed'
    GROUP BY cl.client_id
  )
  SELECT 
    c.id as client_id,
    c.name::TEXT as client_name,
    COALESCE(c.phone, cpn.phone, '')::TEXT as client_phone,
    c.branch::TEXT as client_branch,
    c.avatar_url::TEXT,
    c.telegram_avatar_url::TEXT,
    c.whatsapp_avatar_url::TEXT,
    c.max_avatar_url::TEXT,
    c.telegram_chat_id::TEXT,
    COALESCE(lm.message_text, '')::TEXT as last_message,
    lm.created_at as last_message_time,
    COALESCE(us.unread_count, 0)::BIGINT as unread_count,
    COALESCE(us.unread_whatsapp, 0)::BIGINT as unread_whatsapp,
    COALESCE(us.unread_telegram, 0)::BIGINT as unread_telegram,
    COALESCE(us.unread_max, 0)::BIGINT as unread_max,
    COALESCE(us.unread_email, 0)::BIGINT as unread_email,
    COALESCE(mc.unread_calls, 0)::BIGINT as unread_calls,
    lu.last_unread_messenger::TEXT
  FROM recent_client_times rct
  JOIN clients c ON c.id = rct.cid
  LEFT JOIN client_phone_numbers cpn ON cpn.client_id = c.id AND cpn.is_primary = true
  LEFT JOIN last_messages lm ON lm.cid = c.id
  LEFT JOIN unread_stats us ON us.cid = c.id
  LEFT JOIN last_unread lu ON lu.cid = c.id
  LEFT JOIN missed_calls mc ON mc.cid = c.id
  WHERE c.is_active = true
  ORDER BY lm.created_at DESC NULLS LAST;
END;
$$;

-- Step 6: Add index for faster client_id grouping
CREATE INDEX IF NOT EXISTS idx_chat_messages_client_created_desc 
ON chat_messages (client_id, created_at DESC);
