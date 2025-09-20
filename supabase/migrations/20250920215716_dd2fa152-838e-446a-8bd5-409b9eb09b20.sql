-- Create storage bucket for chat files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-files', 'chat-files', false);

-- Create RLS policies for chat files
CREATE POLICY "Authenticated users can upload chat files" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'chat-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view chat files they have access to" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (bucket_id = 'chat-files');

CREATE POLICY "Users can update their chat files" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (bucket_id = 'chat-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their chat files" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'chat-files' AND auth.uid() IS NOT NULL);