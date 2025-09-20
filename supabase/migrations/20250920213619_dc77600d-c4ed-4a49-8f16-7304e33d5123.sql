-- First, let's see what constraint values are currently allowed for message_type
-- We'll drop and recreate the constraint to include 'comment'

-- Drop the existing check constraint on message_type
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;

-- Add 'comment' as an allowed value for message_type
ALTER TABLE public.chat_messages 
ADD CONSTRAINT chat_messages_message_type_check 
CHECK (message_type IN ('client', 'manager', 'system', 'comment'));

-- Add avatar_url column to clients table for storing WhatsApp profile pictures
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for avatar storage
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "System can upload avatars" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "System can update avatars" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars');

CREATE POLICY "System can delete avatars" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'avatars');