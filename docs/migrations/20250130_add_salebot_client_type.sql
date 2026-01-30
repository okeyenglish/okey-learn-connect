-- Migration: Add salebot_client_type column to clients table
-- Apply to: self-hosted Supabase (api.academyos.ru)
-- Purpose: Store messenger type from Salebot for correct message routing during import
-- 
-- Values mapping:
--   0 = VK
--   1 = Telegram
--   2 = Viber
--   6 = WhatsApp
--   16 = Telegram Bot
--   20 = Max
--   21 = Telegram Personal

-- 1. Add column
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS salebot_client_type integer;

COMMENT ON COLUMN public.clients.salebot_client_type IS 
'Salebot client_type: 0=VK, 1=Telegram, 2=Viber, 6=WhatsApp, 16=TG Bot, 20=Max, 21=TG Personal';

-- 2. Create index for filtering
CREATE INDEX IF NOT EXISTS idx_clients_salebot_client_type 
ON public.clients(salebot_client_type) 
WHERE salebot_client_type IS NOT NULL;

-- 3. Backfill existing clients based on their connected messengers
-- Clients with telegram_user_id but no whatsapp_id -> likely Telegram (type 1)
UPDATE public.clients
SET salebot_client_type = 1
WHERE salebot_client_type IS NULL
  AND telegram_user_id IS NOT NULL
  AND (whatsapp_id IS NULL OR whatsapp_id = '');

-- Clients with whatsapp_id but no telegram_user_id -> likely WhatsApp (type 6)
UPDATE public.clients
SET salebot_client_type = 6
WHERE salebot_client_type IS NULL
  AND whatsapp_id IS NOT NULL
  AND whatsapp_id != ''
  AND (telegram_user_id IS NULL OR telegram_user_id = '');
