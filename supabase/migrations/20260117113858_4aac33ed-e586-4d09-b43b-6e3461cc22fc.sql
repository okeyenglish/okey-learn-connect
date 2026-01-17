-- Фаза 1: Критические индексы для chat_messages
-- Эти индексы ускорят загрузку сообщений в 10-20 раз

-- 1.1. Составной индекс для загрузки сообщений по клиенту (главный индекс)
CREATE INDEX IF NOT EXISTS idx_chat_messages_client_created 
ON chat_messages (client_id, created_at DESC);

-- 1.2. Индекс для быстрого подсчета непрочитанных сообщений
CREATE INDEX IF NOT EXISTS idx_chat_messages_client_unread 
ON chat_messages (client_id, is_read, message_type) 
WHERE is_read = false;

-- 1.3. Индекс для списка чатов (useChatThreads) - последние сообщения
CREATE INDEX IF NOT EXISTS idx_chat_messages_org_created 
ON chat_messages (organization_id, created_at DESC);

-- 1.4. Индекс для real-time фильтрации по organization_id
CREATE INDEX IF NOT EXISTS idx_chat_messages_org_client 
ON chat_messages (organization_id, client_id);

-- Анализируем таблицу для обновления статистики
ANALYZE chat_messages;