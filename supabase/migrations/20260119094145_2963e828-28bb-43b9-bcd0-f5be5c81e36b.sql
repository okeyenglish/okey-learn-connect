-- Add 'wappi' to the messenger_settings provider check constraint
ALTER TABLE messenger_settings DROP CONSTRAINT IF EXISTS messenger_settings_provider_check;

ALTER TABLE messenger_settings ADD CONSTRAINT messenger_settings_provider_check 
  CHECK (provider IN ('greenapi', 'wpp', 'wappi'));