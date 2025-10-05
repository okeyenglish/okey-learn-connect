-- Enable full row data for realtime
ALTER TABLE public.lesson_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.student_lesson_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.student_attendance REPLICA IDENTITY FULL;

-- Add tables to supabase_realtime publication if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname='public' AND tablename='lesson_sessions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.lesson_sessions';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname='public' AND tablename='student_lesson_sessions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.student_lesson_sessions';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname='public' AND tablename='student_attendance'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.student_attendance';
  END IF;
END $$;