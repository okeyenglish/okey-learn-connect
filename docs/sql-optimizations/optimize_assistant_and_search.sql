-- =====================================================
-- SQL OPTIMIZATIONS for self-hosted Supabase
-- Run on: api.academyos.ru
-- Date: 2026-02-10
-- =====================================================

-- 1. Индекс для ilike поиска клиентов (ускорит в ~10x)
-- Текущее: 18 139 вызовов, каждый сканирует всю таблицу
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_clients_name_trgm 
ON public.clients USING GIN (name gin_trgm_ops);

-- Также для first_name и last_name (часто используются в поиске)
CREATE INDEX IF NOT EXISTS idx_clients_first_name_trgm 
ON public.clients USING GIN (first_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clients_last_name_trgm 
ON public.clients USING GIN (last_name gin_trgm_ops);

-- 2. Частичный индекс для assistant_messages (непрочитанные)
-- Текущее: 2M+ UPDATE вызовов по is_read = false
CREATE INDEX IF NOT EXISTS idx_assistant_messages_user_unread 
ON public.assistant_messages (user_id) 
WHERE is_read = false;

-- 3. Индекс для поиска студентов по имени (если используется)
CREATE INDEX IF NOT EXISTS idx_students_first_name_trgm 
ON public.students USING GIN (first_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_students_last_name_trgm 
ON public.students USING GIN (last_name gin_trgm_ops);

-- 4. Составной индекс для chat_messages по client_id + is_read + message_type
-- Ускорит подсчет непрочитанных сообщений
CREATE INDEX IF NOT EXISTS idx_chat_messages_client_unread_type
ON public.chat_messages (client_id, is_read, message_type)
WHERE is_read = false AND message_type = 'client';

-- 5. Проверка существующих индексов
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('clients', 'assistant_messages', 'students', 'chat_messages')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
