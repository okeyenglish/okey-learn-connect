-- ============================================================
-- MATERIALIZED VIEW: teacher_chat_threads_mv
-- Кэширует список чатов преподавателей для быстрой загрузки
-- Execute this on self-hosted Supabase (api.academyos.ru)
-- ============================================================

-- Step 1: Create materialized view for teacher chat threads
CREATE MATERIALIZED VIEW IF NOT EXISTS teacher_chat_threads_mv AS
WITH teacher_links AS (
  -- Get teacher-client links with teacher info
  SELECT 
    tcl.teacher_id,
    tcl.client_id,
    t.profile_id,
    t.first_name as teacher_first_name,
    t.last_name as teacher_last_name,
    c.organization_id
  FROM teacher_client_links tcl
  JOIN teachers t ON t.id = tcl.teacher_id AND t.is_active = true
  JOIN clients c ON c.id = tcl.client_id
),
client_messages AS (
  -- Get last message and unread counts per client
  -- Note: self-hosted uses message_text, not content
  SELECT 
    cm.client_id,
    MAX(cm.created_at) as last_message_time,
    COUNT(*) FILTER (WHERE cm.is_read = false AND cm.is_outgoing = false) as unread_count,
    COUNT(*) FILTER (WHERE cm.is_read = false AND cm.is_outgoing = false AND cm.messenger_type = 'whatsapp') as unread_whatsapp,
    COUNT(*) FILTER (WHERE cm.is_read = false AND cm.is_outgoing = false AND cm.messenger_type = 'telegram') as unread_telegram,
    COUNT(*) FILTER (WHERE cm.is_read = false AND cm.is_outgoing = false AND cm.messenger_type = 'max') as unread_max
  FROM chat_messages cm
  WHERE cm.client_id IS NOT NULL
  GROUP BY cm.client_id
),
last_messages AS (
  -- Get actual last message content (using message_text for self-hosted)
  SELECT DISTINCT ON (cm.client_id)
    cm.client_id,
    cm.message_text as last_message,
    cm.messenger_type as last_messenger,
    cm.created_at as msg_time
  FROM chat_messages cm
  WHERE cm.client_id IS NOT NULL
  ORDER BY cm.client_id, cm.created_at DESC
)
SELECT 
  tl.teacher_id,
  tl.profile_id,
  tl.client_id,
  tl.organization_id,
  c.name as client_name,
  c.first_name,
  c.last_name,
  c.middle_name,
  c.phone as client_phone,
  c.branch as client_branch,
  -- Chat IDs stored in teacher_client_links or NULL
  NULL::text as telegram_chat_id,
  NULL::text as whatsapp_chat_id,
  COALESCE(lm.last_message, '') as last_message,
  COALESCE(lm.last_messenger, '') as last_messenger,
  COALESCE(cmsg.last_message_time, c.created_at) as last_message_time,
  COALESCE(cmsg.unread_count, 0)::int as unread_count,
  COALESCE(cmsg.unread_whatsapp, 0)::int as unread_whatsapp,
  COALESCE(cmsg.unread_telegram, 0)::int as unread_telegram,
  COALESCE(cmsg.unread_max, 0)::int as unread_max,
  NOW() as cached_at
FROM teacher_links tl
JOIN clients c ON c.id = tl.client_id
LEFT JOIN client_messages cmsg ON cmsg.client_id = tl.client_id
LEFT JOIN last_messages lm ON lm.client_id = tl.client_id;


-- Step 2: Create indexes on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_chat_threads_mv_pk 
ON teacher_chat_threads_mv (teacher_id, client_id);

CREATE INDEX IF NOT EXISTS idx_teacher_chat_threads_mv_profile 
ON teacher_chat_threads_mv (profile_id);

CREATE INDEX IF NOT EXISTS idx_teacher_chat_threads_mv_unread 
ON teacher_chat_threads_mv (profile_id, unread_count DESC);

CREATE INDEX IF NOT EXISTS idx_teacher_chat_threads_mv_time 
ON teacher_chat_threads_mv (profile_id, last_message_time DESC);


-- Step 3: Create refresh function
CREATE OR REPLACE FUNCTION refresh_teacher_chat_threads_mv()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY teacher_chat_threads_mv;
END;
$$;


-- Step 4: Create optimized RPC to get teacher chat threads
CREATE OR REPLACE FUNCTION get_teacher_chat_threads_fast(
  p_limit int DEFAULT 100
)
RETURNS TABLE (
  teacher_id uuid,
  client_id uuid,
  client_name text,
  first_name text,
  last_name text,
  middle_name text,
  client_phone text,
  client_branch text,
  telegram_chat_id text,
  whatsapp_chat_id text,
  last_message text,
  last_messenger text,
  last_message_time timestamptz,
  unread_count int,
  unread_whatsapp int,
  unread_telegram int,
  unread_max int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    mv.teacher_id,
    mv.client_id,
    mv.client_name,
    mv.first_name,
    mv.last_name,
    mv.middle_name,
    mv.client_phone,
    mv.client_branch,
    mv.telegram_chat_id,
    mv.whatsapp_chat_id,
    mv.last_message,
    mv.last_messenger,
    mv.last_message_time,
    mv.unread_count,
    mv.unread_whatsapp,
    mv.unread_telegram,
    mv.unread_max
  FROM teacher_chat_threads_mv mv
  WHERE mv.profile_id = auth.uid()
  ORDER BY 
    mv.unread_count DESC,
    mv.last_message_time DESC NULLS LAST
  LIMIT p_limit;
$$;


-- Step 5: Create RPC for unread threads only (fast priority loading)
CREATE OR REPLACE FUNCTION get_teacher_unread_threads(
  p_limit int DEFAULT 50
)
RETURNS TABLE (
  teacher_id uuid,
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
  unread_max int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    mv.teacher_id,
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
    mv.unread_max
  FROM teacher_chat_threads_mv mv
  WHERE mv.profile_id = auth.uid()
    AND mv.unread_count > 0
  ORDER BY mv.last_message_time DESC
  LIMIT p_limit;
$$;


-- Step 6: Grant permissions
GRANT EXECUTE ON FUNCTION refresh_teacher_chat_threads_mv() TO authenticated;
GRANT EXECUTE ON FUNCTION get_teacher_chat_threads_fast(int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_teacher_unread_threads(int) TO authenticated;


-- Step 7: Initial refresh
REFRESH MATERIALIZED VIEW teacher_chat_threads_mv;


-- ============================================================
-- CRON JOB: Add to pg_cron for automatic refresh
-- Run every 2 minutes to keep data fresh
-- ============================================================
-- 
-- SELECT cron.schedule(
--   'refresh-teacher-chat-threads-mv',
--   '*/2 * * * *',
--   $$SELECT refresh_teacher_chat_threads_mv()$$
-- );


-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check materialized view data
-- SELECT * FROM teacher_chat_threads_mv LIMIT 10;

-- Check index usage
-- EXPLAIN ANALYZE SELECT * FROM get_teacher_chat_threads_fast(50);

-- Check unread threads performance
-- EXPLAIN ANALYZE SELECT * FROM get_teacher_unread_threads(20);
