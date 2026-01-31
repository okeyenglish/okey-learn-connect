-- ============================================================
-- OPTIMIZATION: Indexes for chat dialog loading
-- Execute this on self-hosted Supabase (api.academyos.ru)
-- ============================================================

-- Primary index for fetching messages by client sorted by time
-- Used by: get_client_chat_data RPC, useChatMessagesOptimized
CREATE INDEX IF NOT EXISTS idx_chat_messages_client_created
ON chat_messages (client_id, created_at DESC);

-- Partial index for unread incoming messages only
-- Used by: unread count calculations in get_client_chat_data
CREATE INDEX IF NOT EXISTS idx_chat_messages_client_unread
ON chat_messages (client_id, messenger_type)
WHERE is_read = false AND message_type = 'client';

-- Index for external_id lookups (deduplication)
CREATE INDEX IF NOT EXISTS idx_chat_messages_external_id
ON chat_messages (external_id)
WHERE external_id IS NOT NULL;

-- ============================================================
-- ANALYZE: Update statistics after index creation
-- ============================================================

ANALYZE chat_messages;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check index usage for client messages query
-- EXPLAIN (ANALYZE, BUFFERS) 
-- SELECT id, message_text, message_type, created_at
-- FROM chat_messages
-- WHERE client_id = 'your-client-id'
-- ORDER BY created_at DESC
-- LIMIT 101;

-- Check unread count query plan
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT messenger_type, COUNT(*) 
-- FROM chat_messages 
-- WHERE client_id = 'your-client-id' 
--   AND is_read = false 
--   AND message_type = 'client'
-- GROUP BY messenger_type;
