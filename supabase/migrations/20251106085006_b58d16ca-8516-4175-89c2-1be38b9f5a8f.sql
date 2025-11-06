-- Rename green_api_message_id to external_message_id in chat_messages table
ALTER TABLE chat_messages 
RENAME COLUMN green_api_message_id TO external_message_id;

-- Rename green_api_instance_id to external_instance_id in whatsapp_sessions table
ALTER TABLE whatsapp_sessions 
RENAME COLUMN green_api_instance_id TO external_instance_id;

COMMENT ON COLUMN chat_messages.external_message_id IS 'External message ID from WhatsApp provider (WPP, Green API, etc.)';
COMMENT ON COLUMN whatsapp_sessions.external_instance_id IS 'External instance ID from WhatsApp provider';