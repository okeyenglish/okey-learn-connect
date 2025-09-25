-- Allow public access to view textbooks for course materials
CREATE POLICY "Public users can view textbooks"
ON public.textbooks
FOR SELECT
TO public
USING (true);