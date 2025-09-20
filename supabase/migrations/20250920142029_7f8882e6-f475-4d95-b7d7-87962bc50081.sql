-- Create a separate table for client phone numbers to support multiple numbers per client
CREATE TABLE client_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  phone_type TEXT DEFAULT 'mobile', -- mobile, work, home, etc.
  is_primary BOOLEAN DEFAULT false,
  is_whatsapp_enabled BOOLEAN DEFAULT true,
  is_telegram_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(client_id, phone) -- Prevent duplicate phone numbers for same client
);

-- Enable RLS
ALTER TABLE client_phone_numbers ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Allow all operations on client_phone_numbers" 
ON client_phone_numbers 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_client_phone_numbers_updated_at
  BEFORE UPDATE ON client_phone_numbers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing phone numbers from clients table to the new table
INSERT INTO client_phone_numbers (client_id, phone, is_primary, phone_type)
SELECT id, phone, true, 'mobile'
FROM clients 
WHERE phone IS NOT NULL AND phone != '';

-- Add a phone_number_id to chat_messages to track which number was used
ALTER TABLE chat_messages 
ADD COLUMN phone_number_id UUID REFERENCES client_phone_numbers(id) ON DELETE SET NULL;