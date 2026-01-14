-- Add telegram_user_id to clients table for Telegram integration
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS telegram_user_id BIGINT;

-- Create index for faster lookups by telegram_user_id
CREATE INDEX IF NOT EXISTS idx_clients_telegram_user_id ON public.clients(telegram_user_id) WHERE telegram_user_id IS NOT NULL;