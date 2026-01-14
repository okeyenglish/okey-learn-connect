-- Add messenger columns to client_phone_numbers table
ALTER TABLE client_phone_numbers 
ADD COLUMN IF NOT EXISTS whatsapp_chat_id TEXT,
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT,
ADD COLUMN IF NOT EXISTS telegram_user_id BIGINT,
ADD COLUMN IF NOT EXISTS max_chat_id TEXT,
ADD COLUMN IF NOT EXISTS max_user_id BIGINT,
ADD COLUMN IF NOT EXISTS whatsapp_avatar_url TEXT,
ADD COLUMN IF NOT EXISTS telegram_avatar_url TEXT,
ADD COLUMN IF NOT EXISTS max_avatar_url TEXT;

-- Add index for faster lookups by chat_id
CREATE INDEX IF NOT EXISTS idx_client_phone_numbers_whatsapp_chat_id ON client_phone_numbers(whatsapp_chat_id) WHERE whatsapp_chat_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_phone_numbers_telegram_chat_id ON client_phone_numbers(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_phone_numbers_max_chat_id ON client_phone_numbers(max_chat_id) WHERE max_chat_id IS NOT NULL;

-- Migrate existing data from clients to client_phone_numbers for primary numbers
UPDATE client_phone_numbers cpn
SET 
  whatsapp_chat_id = c.whatsapp_chat_id,
  telegram_chat_id = c.telegram_chat_id,
  telegram_user_id = c.telegram_user_id,
  max_chat_id = c.max_chat_id,
  max_user_id = c.max_user_id,
  whatsapp_avatar_url = c.whatsapp_avatar_url,
  telegram_avatar_url = c.telegram_avatar_url,
  max_avatar_url = c.max_avatar_url
FROM clients c
WHERE cpn.client_id = c.id
  AND cpn.is_primary = true
  AND (c.whatsapp_chat_id IS NOT NULL OR c.telegram_chat_id IS NOT NULL OR c.max_chat_id IS NOT NULL);

-- Add comment for documentation
COMMENT ON COLUMN client_phone_numbers.whatsapp_chat_id IS 'WhatsApp chat ID for this phone number';
COMMENT ON COLUMN client_phone_numbers.telegram_chat_id IS 'Telegram chat ID for this phone number';
COMMENT ON COLUMN client_phone_numbers.telegram_user_id IS 'Telegram user ID for this phone number';
COMMENT ON COLUMN client_phone_numbers.max_chat_id IS 'MAX chat ID for this phone number';
COMMENT ON COLUMN client_phone_numbers.max_user_id IS 'MAX user ID for this phone number';