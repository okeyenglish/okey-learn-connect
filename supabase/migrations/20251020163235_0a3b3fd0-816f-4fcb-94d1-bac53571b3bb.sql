-- Create documents storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800, -- 50MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT, -- Path in storage bucket (null for online documents)
  file_size BIGINT, -- File size in bytes
  mime_type TEXT,
  document_type TEXT NOT NULL CHECK (document_type IN ('file', 'online')), -- 'file' for uploaded, 'online' for created in app
  content TEXT, -- For online documents
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_path TEXT DEFAULT '/', -- Virtual folder structure
  is_shared BOOLEAN DEFAULT false,
  shared_with UUID[], -- Array of user IDs who have access
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_documents_owner ON public.documents(owner_id);
CREATE INDEX idx_documents_folder ON public.documents(folder_path);
CREATE INDEX idx_documents_shared ON public.documents USING GIN(shared_with);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own documents
CREATE POLICY "Users can view own documents"
ON public.documents
FOR SELECT
USING (
  auth.uid() = owner_id 
  OR 
  auth.uid() = ANY(shared_with)
);

-- Policy: Users can create documents
CREATE POLICY "Users can create documents"
ON public.documents
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can update their own documents
CREATE POLICY "Users can update own documents"
ON public.documents
FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can delete their own documents
CREATE POLICY "Users can delete own documents"
ON public.documents
FOR DELETE
USING (auth.uid() = owner_id);

-- Storage policies for documents bucket
CREATE POLICY "Users can view own documents in storage"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can upload own documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own documents in storage"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own documents in storage"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Trigger to update updated_at
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create document_access_logs table for tracking who accessed shared documents
CREATE TABLE public.document_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('view', 'download', 'edit')),
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_document_access_logs_document ON public.document_access_logs(document_id);
CREATE INDEX idx_document_access_logs_user ON public.document_access_logs(user_id);

ALTER TABLE public.document_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view logs for their documents"
ON public.document_access_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = document_access_logs.document_id
    AND documents.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can create access logs"
ON public.document_access_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);