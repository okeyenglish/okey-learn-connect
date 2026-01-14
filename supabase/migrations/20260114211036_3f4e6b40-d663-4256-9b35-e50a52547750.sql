-- Add separate avatar fields for different messengers
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS whatsapp_avatar_url TEXT,
ADD COLUMN IF NOT EXISTS max_avatar_url TEXT,
ADD COLUMN IF NOT EXISTS telegram_avatar_url TEXT;

-- Add comments
COMMENT ON COLUMN public.clients.whatsapp_avatar_url IS 'Avatar URL from WhatsApp messenger';
COMMENT ON COLUMN public.clients.max_avatar_url IS 'Avatar URL from Max messenger';
COMMENT ON COLUMN public.clients.telegram_avatar_url IS 'Avatar URL from Telegram messenger';