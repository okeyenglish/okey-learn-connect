-- Миграция: Добавить колонку integration_id в chat_messages
-- Для Smart Routing - определяет какой аккаунт Telegram/WhatsApp/Max использовать для ответа
-- Выполнить на self-hosted Supabase (api.academyos.ru)

-- 1. Добавить колонку integration_id
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS integration_id uuid;

-- 2. Индекс для ускорения smart routing запросов
CREATE INDEX IF NOT EXISTS idx_chat_messages_integration_id 
ON public.chat_messages(integration_id) 
WHERE integration_id IS NOT NULL;

-- 3. Комментарий для документации
COMMENT ON COLUMN public.chat_messages.integration_id IS 
'ID интеграции мессенджера для smart routing - определяет какой аккаунт использовать для ответа';

-- 4. Проверить что колонка добавлена
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'chat_messages' AND column_name = 'integration_id';
