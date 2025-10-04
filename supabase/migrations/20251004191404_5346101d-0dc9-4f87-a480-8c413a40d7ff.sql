DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'individual_lesson_history'
      AND policyname = 'Authenticated users can view lesson history'
  ) THEN
    CREATE POLICY "Authenticated users can view lesson history"
    ON public.individual_lesson_history
    FOR SELECT
    USING (auth.uid() IS NOT NULL);
  END IF;
END $$;