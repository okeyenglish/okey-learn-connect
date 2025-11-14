-- Add public SELECT policy for branch photos in storage
CREATE POLICY "Branch photos are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'branch-photos');