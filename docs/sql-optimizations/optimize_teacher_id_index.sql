-- ============================================================
-- OPTIMIZATION: Index for teacher_id in chat_messages
-- Execute this on self-hosted Supabase (api.academyos.ru)
-- ============================================================

-- CRITICAL: This index is essential for fast teacher chat loading!
-- Without it, queries filter ALL chat_messages sequentially.

-- Primary index for fetching messages by teacher_id
CREATE INDEX IF NOT EXISTS idx_chat_messages_teacher_id_created
ON chat_messages (teacher_id, created_at DESC)
WHERE teacher_id IS NOT NULL;

-- Partial index for unread teacher messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_teacher_unread
ON chat_messages (teacher_id, created_at DESC)
WHERE teacher_id IS NOT NULL AND is_read = false;

-- ============================================================
-- ANALYZE: Update statistics after index creation
-- ============================================================

ANALYZE chat_messages;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check if index is being used (should show Index Scan, not Seq Scan)
-- EXPLAIN (ANALYZE, BUFFERS) 
-- SELECT * FROM chat_messages
-- WHERE teacher_id = 'your-teacher-uuid'
-- ORDER BY created_at DESC
-- LIMIT 51;

-- Check index exists
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'chat_messages' AND indexname LIKE '%teacher%';
