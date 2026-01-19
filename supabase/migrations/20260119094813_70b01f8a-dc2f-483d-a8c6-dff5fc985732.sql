-- Fix the existing Wappi settings record - update provider and enable it
UPDATE messenger_settings 
SET 
  provider = 'wappi',
  is_enabled = true,
  webhook_url = 'https://kbojujfwtvmsgudumown.supabase.co/functions/v1/wappi-whatsapp-webhook'
WHERE id = 'a5998a40-8910-4661-9752-5ff15ac326ac';