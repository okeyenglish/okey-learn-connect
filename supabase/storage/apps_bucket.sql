-- Create apps Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('apps', 'apps', true, 10485760, ARRAY['text/html'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for apps bucket
DO $$
BEGIN
  -- Public read access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Apps are publicly accessible'
  ) THEN
    CREATE POLICY "Apps are publicly accessible" ON storage.objects
      FOR SELECT USING (bucket_id = 'apps');
  END IF;

  -- Authenticated users can upload
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Authors can upload apps'
  ) THEN
    CREATE POLICY "Authors can upload apps" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'apps' AND auth.uid() IS NOT NULL);
  END IF;

  -- Authors can update their apps
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Authors can update their apps'
  ) THEN
    CREATE POLICY "Authors can update their apps" ON storage.objects
      FOR UPDATE USING (bucket_id = 'apps' AND auth.uid() IS NOT NULL);
  END IF;

  -- Authors can delete their apps
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Authors can delete their apps'
  ) THEN
    CREATE POLICY "Authors can delete their apps" ON storage.objects
      FOR DELETE USING (bucket_id = 'apps' AND auth.uid() IS NOT NULL);
  END IF;
END $$;
