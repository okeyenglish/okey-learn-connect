-- Ensure all authenticated users can view data across all branches
-- Add permissive SELECT policies (idempotent, allows existing policies to coexist)

DO $$
BEGIN
  -- Classrooms
  IF to_regclass('public.classrooms') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname='public' AND tablename='classrooms' 
        AND policyname='Authenticated users can view all classrooms'
    ) THEN
      CREATE POLICY "Authenticated users can view all classrooms"
        ON public.classrooms FOR SELECT
        USING (auth.uid() IS NOT NULL);
    END IF;
  END IF;

  -- Group students
  IF to_regclass('public.group_students') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname='public' AND tablename='group_students' 
        AND policyname='Authenticated users can view all group students'
    ) THEN
      CREATE POLICY "Authenticated users can view all group students"
        ON public.group_students FOR SELECT
        USING (auth.uid() IS NOT NULL);
    END IF;
  END IF;

  -- Individual lessons
  IF to_regclass('public.individual_lessons') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname='public' AND tablename='individual_lessons' 
        AND policyname='Authenticated users can view all individual lessons'
    ) THEN
      CREATE POLICY "Authenticated users can view all individual lessons"
        ON public.individual_lessons FOR SELECT
        USING (auth.uid() IS NOT NULL);
    END IF;
  END IF;

  -- Lead status history
  IF to_regclass('public.lead_status_history') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname='public' AND tablename='lead_status_history' 
        AND policyname='Authenticated users can view all lead status history'
    ) THEN
      CREATE POLICY "Authenticated users can view all lead status history"
        ON public.lead_status_history FOR SELECT
        USING (auth.uid() IS NOT NULL);
    END IF;
  END IF;

  -- Learning groups
  IF to_regclass('public.learning_groups') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname='public' AND tablename='learning_groups' 
        AND policyname='Authenticated users can view all learning groups'
    ) THEN
      CREATE POLICY "Authenticated users can view all learning groups"
        ON public.learning_groups FOR SELECT
        USING (auth.uid() IS NOT NULL);
    END IF;
  END IF;

  -- Lesson sessions
  IF to_regclass('public.lesson_sessions') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname='public' AND tablename='lesson_sessions' 
        AND policyname='Authenticated users can view all lesson sessions'
    ) THEN
      CREATE POLICY "Authenticated users can view all lesson sessions"
        ON public.lesson_sessions FOR SELECT
        USING (auth.uid() IS NOT NULL);
    END IF;
  END IF;

  -- Students
  IF to_regclass('public.students') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname='public' AND tablename='students' 
        AND policyname='Authenticated users can view all students'
    ) THEN
      CREATE POLICY "Authenticated users can view all students"
        ON public.students FOR SELECT
        USING (auth.uid() IS NOT NULL);
    END IF;
  END IF;
END $$;