-- ============================================================
-- OPTIMIZATION: Partial Indexes for chat_messages
-- Execute this on self-hosted Supabase (api.academyos.ru)
-- ============================================================

-- Step 1: Partial index for recent messages (last 7 days)
-- This dramatically speeds up queries for recent messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_recent_7d
ON chat_messages (client_id, created_at DESC)
WHERE created_at > NOW() - INTERVAL '7 days';

-- Step 2: Partial index for unread incoming messages
-- Used by unread count calculations
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread_incoming
ON chat_messages (client_id, created_at DESC)
WHERE is_read = false AND is_outgoing = false;

-- Step 3: Composite index for last message lookup
-- Optimizes DISTINCT ON queries for latest messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_client_latest
ON chat_messages (client_id, created_at DESC NULLS LAST)
INCLUDE (message_text, messenger_type);

-- Step 4: Index for message type filtering
CREATE INDEX IF NOT EXISTS idx_chat_messages_type_created
ON chat_messages (message_type, created_at DESC)
WHERE message_type = 'client';

-- Step 5: BRIN index for time-series data (very efficient for large tables)
-- Note: Only create if table has 100k+ rows
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_brin
ON chat_messages USING BRIN (created_at)
WITH (pages_per_range = 128);


-- ============================================================
-- OPTIMIZATION: Indexes for clients table
-- ============================================================

-- Index for active clients lookup
CREATE INDEX IF NOT EXISTS idx_clients_active
ON clients (organization_id, id)
WHERE is_active = true;

-- Index for last_message_at sorting
CREATE INDEX IF NOT EXISTS idx_clients_last_message
ON clients (organization_id, last_message_at DESC NULLS LAST)
WHERE is_active = true;


-- ============================================================
-- OPTIMIZATION: Indexes for teacher_client_links
-- ============================================================

-- Composite index for teacher-client lookups
CREATE INDEX IF NOT EXISTS idx_teacher_client_links_teacher_client
ON teacher_client_links (teacher_id, client_id);

-- Index for client lookup in links
CREATE INDEX IF NOT EXISTS idx_teacher_client_links_client
ON teacher_client_links (client_id);


-- ============================================================
-- ANALYZE: Update statistics after index creation
-- ============================================================

ANALYZE chat_messages;
ANALYZE clients;
ANALYZE teacher_client_links;


-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check all indexes on chat_messages
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'chat_messages'
-- ORDER BY indexname;

-- Check index usage stats
-- SELECT 
--   schemaname, tablename, indexname, 
--   idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes 
-- WHERE tablename = 'chat_messages'
-- ORDER BY idx_scan DESC;

-- Check table size and index sizes
-- SELECT 
--   pg_size_pretty(pg_relation_size('chat_messages')) as table_size,
--   pg_size_pretty(pg_indexes_size('chat_messages')) as indexes_size;
