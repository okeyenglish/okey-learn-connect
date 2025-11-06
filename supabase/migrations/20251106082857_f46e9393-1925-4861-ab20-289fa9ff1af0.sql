-- Function to automatically create WhatsApp chat ID from phone number
CREATE OR REPLACE FUNCTION auto_init_whatsapp_chat_id()
RETURNS TRIGGER AS $$
DECLARE
  clean_phone TEXT;
  chat_id TEXT;
BEGIN
  -- Only process if phone exists
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    -- Clean phone number (remove all non-digit characters)
    clean_phone := regexp_replace(NEW.phone, '[^\d]', '', 'g');
    
    -- Create WhatsApp chat ID
    chat_id := clean_phone || '@c.us';
    
    -- Update client's whatsapp_chat_id if not already set OR if this is a WhatsApp-enabled number
    UPDATE clients 
    SET whatsapp_chat_id = chat_id,
        updated_at = NOW()
    WHERE id = NEW.client_id 
      AND (whatsapp_chat_id IS NULL OR NEW.is_whatsapp_enabled = true);
    
    -- Log the action
    RAISE NOTICE 'WhatsApp chat ID initialized: % for client: %', chat_id, NEW.client_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT on client_phone_numbers
DROP TRIGGER IF EXISTS trigger_auto_init_whatsapp_on_insert ON client_phone_numbers;
CREATE TRIGGER trigger_auto_init_whatsapp_on_insert
  AFTER INSERT ON client_phone_numbers
  FOR EACH ROW
  EXECUTE FUNCTION auto_init_whatsapp_chat_id();

-- Create trigger for UPDATE on client_phone_numbers
DROP TRIGGER IF EXISTS trigger_auto_init_whatsapp_on_update ON client_phone_numbers;
CREATE TRIGGER trigger_auto_init_whatsapp_on_update
  AFTER UPDATE OF phone, is_whatsapp_enabled ON client_phone_numbers
  FOR EACH ROW
  WHEN (NEW.phone IS DISTINCT FROM OLD.phone OR NEW.is_whatsapp_enabled IS DISTINCT FROM OLD.is_whatsapp_enabled)
  EXECUTE FUNCTION auto_init_whatsapp_chat_id();

-- Backfill existing phone numbers to initialize WhatsApp chat IDs
DO $$
DECLARE
  phone_record RECORD;
  clean_phone TEXT;
  chat_id TEXT;
BEGIN
  FOR phone_record IN 
    SELECT DISTINCT ON (cpn.client_id) 
      cpn.client_id, 
      cpn.phone,
      cpn.is_whatsapp_enabled
    FROM client_phone_numbers cpn
    INNER JOIN clients c ON c.id = cpn.client_id
    WHERE c.whatsapp_chat_id IS NULL 
      AND cpn.phone IS NOT NULL
    ORDER BY cpn.client_id, cpn.is_whatsapp_enabled DESC, cpn.created_at DESC
  LOOP
    -- Clean phone number
    clean_phone := regexp_replace(phone_record.phone, '[^\d]', '', 'g');
    chat_id := clean_phone || '@c.us';
    
    -- Update client
    UPDATE clients 
    SET whatsapp_chat_id = chat_id,
        updated_at = NOW()
    WHERE id = phone_record.client_id;
    
    RAISE NOTICE 'Backfilled WhatsApp chat ID: % for client: %', chat_id, phone_record.client_id;
  END LOOP;
END $$;