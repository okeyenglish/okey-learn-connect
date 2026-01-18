-- Покрывающий индекс для загрузки сообщений по client_id (облегчённая версия)
-- Исключаем большие текстовые поля (message_text, file_url) из-за ограничения размера индекса
-- Включаем только небольшие поля для ускорения фильтрации

CREATE INDEX IF NOT EXISTS idx_chat_messages_client_meta
ON chat_messages (client_id, created_at DESC)
INCLUDE (
  messenger_type, 
  is_read, 
  is_outgoing, 
  message_type,
  message_status
);

-- Оптимизированный индекс для подсчёта непрочитанных (частичный индекс)
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread_client
ON chat_messages (client_id, messenger_type)
WHERE is_read = false AND message_type = 'client';

COMMENT ON INDEX idx_chat_messages_client_meta IS 'Covering index for message metadata - speeds up filtering without full table scan';
COMMENT ON INDEX idx_chat_messages_unread_client IS 'Partial index for fast unread message counting per client';