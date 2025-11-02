-- Добавить поддержку нескольких провайдеров WhatsApp
ALTER TABLE messenger_settings
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'greenapi' CHECK (provider IN ('greenapi', 'wpp'));

-- Обновить существующие записи
UPDATE messenger_settings 
SET provider = 'greenapi' 
WHERE messenger_type = 'whatsapp' AND provider IS NULL;

COMMENT ON COLUMN messenger_settings.provider IS 'WhatsApp provider: greenapi or wpp';
