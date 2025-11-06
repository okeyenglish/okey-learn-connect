-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER TABLE messages REPLICA IDENTITY FULL;

-- Fix RLS policy for messages to support 'client' thread_type
DROP POLICY IF EXISTS "Users can view messages in their threads" ON messages;

CREATE POLICY "Users can view messages in their threads" ON messages
FOR SELECT USING (
  (thread_type = 'assistant' AND thread_id IN (
    SELECT id FROM assistant_threads WHERE owner_id = auth.uid()
  ))
  OR
  (thread_type = 'chat' AND thread_id IN (
    SELECT id FROM chat_threads WHERE auth.uid() = ANY(participants)
  ))
  OR
  (thread_type = 'client' AND thread_id IN (
    SELECT id FROM chat_threads WHERE auth.uid() = ANY(participants)
  ))
);

-- Add green_api_instance_id column to whatsapp_sessions for tracking
ALTER TABLE whatsapp_sessions 
ADD COLUMN IF NOT EXISTS green_api_instance_id TEXT;

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_instance_id 
ON whatsapp_sessions(green_api_instance_id);

-- Add client_id to chat_threads for better client association
ALTER TABLE chat_threads
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);

CREATE INDEX IF NOT EXISTS idx_chat_threads_client_id 
ON chat_threads(client_id);