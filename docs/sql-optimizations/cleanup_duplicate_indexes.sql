-- =====================================================
-- CLEANUP: Remove duplicate indexes on chat_messages
-- Run on: api.academyos.ru
-- Date: 2026-02-10
-- 
-- These duplicates slow down INSERT/UPDATE operations
-- without providing any query benefit
-- =====================================================

-- 1. Дубликаты (client_id, created_at DESC) — оставляем только idx_chat_messages_client_meta (covering index)
-- Он включает INCLUDE (messenger_type, is_read, is_outgoing, message_type, message_status)
-- и покрывает все запросы, которые используют остальные 5 индексов

DROP INDEX IF EXISTS idx_chat_messages_client_created;
DROP INDEX IF EXISTS idx_chat_messages_client_created_desc;
DROP INDEX IF EXISTS idx_chat_messages_client_id_created;
DROP INDEX IF EXISTS idx_chat_messages_client_id_created_at;
DROP INDEX IF EXISTS idx_chat_messages_client_id_created_desc;
-- Оставляем: idx_chat_messages_client_meta (covering) и idx_chat_messages_threads_covering

-- 2. Дубликаты unread индексов — оставляем idx_chat_messages_client_unread_partial
-- idx_chat_messages_client_unread_partial: (client_id, messenger_type) WHERE is_read=false AND message_type='client'
-- idx_chat_messages_unread_client: то же самое
-- idx_chat_messages_unread_client_type: то же самое

DROP INDEX IF EXISTS idx_chat_messages_unread_client;
DROP INDEX IF EXISTS idx_chat_messages_unread_client_type;
-- Оставляем: idx_chat_messages_client_unread_partial

-- 3. Дубликат external_id
-- idx_chat_messages_external_id и idx_chat_messages_green_api_message_id — идентичные
DROP INDEX IF EXISTS idx_chat_messages_green_api_message_id;
-- Оставляем: idx_chat_messages_external_id

-- 4. Дубликаты assistant_messages
-- idx_assistant_messages_user_id и idx_assistant_messages_user_unread покрываются idx_assistant_messages_unread
DROP INDEX IF EXISTS idx_assistant_messages_user_id;
-- Оставляем: idx_assistant_messages_unread (user_id, is_read WHERE is_read=false)
-- и idx_assistant_messages_user_unread (user_id WHERE is_read=false)

-- 5. Дубликаты students
DROP INDEX IF EXISTS idx_students_external;
-- Оставляем: idx_students_external_id

DROP INDEX IF EXISTS idx_students_family_group;
-- Оставляем: idx_students_family_group_id

-- Проверка: сколько индексов осталось
SELECT COUNT(*) as total_indexes, 
       tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('chat_messages', 'assistant_messages', 'students', 'clients')
GROUP BY tablename
ORDER BY total_indexes DESC;
