-- Добавляем поле для хранения ID сообщения из Salebot
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS salebot_message_id TEXT;

-- Создаем уникальный индекс для предотвращения дубликатов сообщений из Salebot
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_messages_salebot_unique 
ON public.chat_messages (client_id, salebot_message_id) 
WHERE salebot_message_id IS NOT NULL;

-- Комментарий для документации
COMMENT ON COLUMN public.chat_messages.salebot_message_id IS 'ID сообщения из платформы Salebot для предотвращения дубликатов при повторном импорте';