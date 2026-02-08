-- Миграция: Добавить колонку source_messenger_type в online_payments
-- Выполнить на self-hosted Supabase (api.academyos.ru)
--
-- Эта колонка хранит тип мессенджера, через который была отправлена ссылка на оплату.
-- При успешной оплате вебхук создаст сообщение с этим messenger_type,
-- чтобы уведомление отобразилось в правильной вкладке (WhatsApp/Telegram/Max).

-- 1. Добавить колонку
ALTER TABLE online_payments 
ADD COLUMN IF NOT EXISTS source_messenger_type TEXT DEFAULT 'whatsapp';

-- 2. Комментарий для документации
COMMENT ON COLUMN online_payments.source_messenger_type 
IS 'Мессенджер, через который была отправлена ссылка на оплату (whatsapp/telegram/max)';

-- 3. Проверить что колонка добавлена
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'online_payments' AND column_name = 'source_messenger_type';
