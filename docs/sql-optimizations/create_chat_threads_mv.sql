-- ============================================================
-- MATERIALIZED VIEW: chat_threads_mv
-- Кэширует список чатов для быстрой загрузки в CRM
-- Execute this on self-hosted Supabase (api.academyos.ru)
-- ============================================================

-- Step 1: Create materialized view for chat threads
CREATE MATERIALIZED VIEW IF NOT EXISTS chat_threads_mv AS
WITH client_messages AS (
  -- Get last message and unread counts per client
  SELECT 
    cm.client_id,
    MAX(cm.created_at) as last_message_time,
    COUNT(*) FILTER (WHERE cm.is_read = false AND cm.is_outgoing = false) as unread_count,
    COUNT(*) FILTER (WHERE cm.is_read = false AND cm.is_outgoing = false AND cm.messenger_type = 'whatsapp') as unread_whatsapp,
    COUNT(*) FILTER (WHERE cm.is_read = false AND cm.is_outgoing = false AND cm.messenger_type = 'telegram') as unread_telegram,
    COUNT(*) FILTER (WHERE cm.is_read = false AND cm.is_outgoing = false AND cm.messenger_type = 'max') as unread_max,
    COUNT(*) FILTER (WHERE cm.is_read = false AND cm.is_outgoing = false AND cm.messenger_type = 'salebot') as unread_salebot
  FROM chat_messages cm
  WHERE cm.client_id IS NOT NULL
  GROUP BY cm.client_id
),
last_messages AS (
  -- Get actual last message content
  SELECT DISTINCT ON (cm.client_id)
    cm.client_id,
    cm.message_text as last_message,
    cm.messenger_type::text as last_messenger,
    cm.created_at as msg_time
  FROM chat_messages cm
  WHERE cm.client_id IS NOT NULL
  ORDER BY cm.client_id, cm.created_at DESC
)
SELECT 
  c.id as client_id,
  c.organization_id,
  c.name as client_name,
  c.first_name,
  c.last_name,
  c.middle_name,
  c.phone as client_phone,
  c.email as client_email,
  c.branch as client_branch,
  c.whatsapp_id,
  c.telegram_user_id,
  c.salebot_client_id,
  c.is_active,
  COALESCE(lm.last_message, '') as last_message,
  COALESCE(lm.last_messenger, '')::text as last_messenger,
  COALESCE(cmsg.last_message_time, c.created_at) as last_message_time,
  COALESCE(cmsg.unread_count, 0)::int as unread_count,
  COALESCE(cmsg.unread_whatsapp, 0)::int as unread_whatsapp,
  COALESCE(cmsg.unread_telegram, 0)::int as unread_telegram,
  COALESCE(cmsg.unread_max, 0)::int as unread_max,
  COALESCE(cmsg.unread_salebot, 0)::int as unread_salebot,
  NOW() as cached_at
FROM clients c
LEFT JOIN client_messages cmsg ON cmsg.client_id = c.id
LEFT JOIN last_messages lm ON lm.client_id = c.id
WHERE c.is_active = true;


-- Step 2: Create indexes on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_threads_mv_pk 
ON chat_threads_mv (client_id);

CREATE INDEX IF NOT EXISTS idx_chat_threads_mv_org 
ON chat_threads_mv (organization_id);

CREATE INDEX IF NOT EXISTS idx_chat_threads_mv_unread 
ON chat_threads_mv (organization_id, unread_count DESC);

CREATE INDEX IF NOT EXISTS idx_chat_threads_mv_time 
ON chat_threads_mv (organization_id, last_message_time DESC);

CREATE INDEX IF NOT EXISTS idx_chat_threads_mv_branch 
ON chat_threads_mv (organization_id, client_branch);


-- Step 3: Create refresh function
CREATE OR REPLACE FUNCTION refresh_chat_threads_mv()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY chat_threads_mv;
END;
$$;


-- Step 4: Create optimized RPC to get chat threads from MV
CREATE OR REPLACE FUNCTION get_chat_threads_from_mv(
  p_organization_id uuid,
  p_branch text DEFAULT NULL,
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  client_id uuid,
  client_name text,
  first_name text,
  last_name text,
  middle_name text,
  client_phone text,
  client_email text,
  client_branch text,
  whatsapp_id text,
  telegram_user_id text,
  salebot_client_id text,
  last_message text,
  last_messenger text,
  last_message_time timestamptz,
  unread_count int,
  unread_whatsapp int,
  unread_telegram int,
  unread_max int,
  unread_salebot int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    mv.client_id,
    mv.client_name,
    mv.first_name,
    mv.last_name,
    mv.middle_name,
    mv.client_phone,
    mv.client_email,
    mv.client_branch,
    mv.whatsapp_id,
    mv.telegram_user_id,
    mv.salebot_client_id,
    mv.last_message,
    mv.last_messenger,
    mv.last_message_time,
    mv.unread_count,
    mv.unread_whatsapp,
    mv.unread_telegram,
    mv.unread_max,
    mv.unread_salebot
  FROM chat_threads_mv mv
  WHERE mv.organization_id = p_organization_id
    AND (p_branch IS NULL OR mv.client_branch = p_branch)
  ORDER BY 
    mv.unread_count DESC,
    mv.last_message_time DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
$$;


-- Step 5: Create RPC for unread threads only (priority loading)
CREATE OR REPLACE FUNCTION get_unread_threads_from_mv(
  p_organization_id uuid,
  p_limit int DEFAULT 50
)
RETURNS TABLE (
  client_id uuid,
  client_name text,
  first_name text,
  last_name text,
  client_phone text,
  last_message text,
  last_message_time timestamptz,
  unread_count int,
  unread_whatsapp int,
  unread_telegram int,
  unread_max int,
  unread_salebot int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    mv.client_id,
    mv.client_name,
    mv.first_name,
    mv.last_name,
    mv.client_phone,
    mv.last_message,
    mv.last_message_time,
    mv.unread_count,
    mv.unread_whatsapp,
    mv.unread_telegram,
    mv.unread_max,
    mv.unread_salebot
  FROM chat_threads_mv mv
  WHERE mv.organization_id = p_organization_id
    AND mv.unread_count > 0
  ORDER BY mv.last_message_time DESC
  LIMIT p_limit;
$$;


-- Step 6: Grant permissions
GRANT EXECUTE ON FUNCTION refresh_chat_threads_mv() TO authenticated;
GRANT EXECUTE ON FUNCTION get_chat_threads_from_mv(uuid, text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_threads_from_mv(uuid, int) TO authenticated;


-- Step 7: Initial refresh
REFRESH MATERIALIZED VIEW chat_threads_mv;


-- ============================================================
-- CRON JOB: Add to pg_cron for automatic refresh
-- Run every 1 minute to keep data fresh
-- ============================================================
-- 
-- SELECT cron.schedule(
--   'refresh-chat-threads-mv',
--   '*/1 * * * *',
--   $$SELECT refresh_chat_threads_mv()$$
-- );


-- ============================================================
-- TRIGGER: Refresh MV on message insert (alternative to cron)
-- Uncomment if you prefer trigger-based refresh
-- ============================================================
-- 
-- CREATE OR REPLACE FUNCTION trigger_refresh_chat_threads_mv()
-- RETURNS trigger
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$
-- BEGIN
--   -- Debounce: only refresh if last refresh was > 30 seconds ago
--   IF NOT EXISTS (
--     SELECT 1 FROM chat_threads_mv 
--     WHERE cached_at > NOW() - INTERVAL '30 seconds' 
--     LIMIT 1
--   ) THEN
--     PERFORM refresh_chat_threads_mv();
--   END IF;
--   RETURN NULL;
-- END;
-- $$;
-- 
-- CREATE TRIGGER refresh_mv_on_message
-- AFTER INSERT ON chat_messages
-- FOR EACH STATEMENT
-- EXECUTE FUNCTION trigger_refresh_chat_threads_mv();


-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check materialized view data
-- SELECT * FROM chat_threads_mv ORDER BY unread_count DESC LIMIT 20;

-- Check refresh performance
-- EXPLAIN ANALYZE REFRESH MATERIALIZED VIEW CONCURRENTLY chat_threads_mv;

-- Check RPC performance
-- EXPLAIN ANALYZE SELECT * FROM get_chat_threads_from_mv('your-org-id', NULL, 50, 0);

-- Check view size
-- SELECT pg_size_pretty(pg_relation_size('chat_threads_mv')) as mv_size;
