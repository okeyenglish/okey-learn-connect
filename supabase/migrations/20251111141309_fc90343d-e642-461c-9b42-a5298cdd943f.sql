-- Create storage bucket for branch photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'branch-photos',
  'branch-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Create RLS policies for branch-photos bucket
CREATE POLICY "Public can view branch photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'branch-photos');

CREATE POLICY "Admins can upload branch photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'branch-photos' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    JOIN public.user_roles ON user_roles.user_id = profiles.id
    WHERE profiles.id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can update branch photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'branch-photos' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    JOIN public.user_roles ON user_roles.user_id = profiles.id
    WHERE profiles.id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete branch photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'branch-photos' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    JOIN public.user_roles ON user_roles.user_id = profiles.id
    WHERE profiles.id = auth.uid()
    AND user_roles.role = 'admin'
  )
);