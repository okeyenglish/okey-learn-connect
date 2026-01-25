-- Create storage bucket for employment documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('employment-docs', 'employment-docs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view employment docs (public bucket for employee onboarding)
CREATE POLICY "Public read access for employment docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'employment-docs');

-- Allow authenticated users with admin/manager role to upload/update/delete
CREATE POLICY "Admins can manage employment docs"
ON storage.objects FOR ALL
USING (
  bucket_id = 'employment-docs' 
  AND (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager', 'branch_manager')
    )
  )
)
WITH CHECK (
  bucket_id = 'employment-docs' 
  AND (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager', 'branch_manager')
    )
  )
);