-- Ensure all authenticated users can view data across branches, without changing write permissions
-- Add permissive SELECT policies to branch-restricted tables (idempotent)

-- Classrooms
DO $outer$
BEGIN
  IF to_regclass('public.classrooms') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname='public' AND tablename='classrooms' 
        AND cmd='SELECT' AND policyname='Authenticated users can view all classrooms'
    ) THEN
      CREATE POLICY "Authenticated users can view all classrooms"
        ON public.classrooms FOR SELECT
        USING (auth.uid() IS NOT NULL);
    END IF;
  END IF;
END $outer$;

-- Group students
DO $outer$
BEGIN
  IF to_regclass('public.group_students') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname='public' AND tablename='group_students' 
        AND cmd='SELECT' AND policyname='Authenticated users can view all group students'
    ) THEN
      CREATE POLICY "Authenticated users can view all group students"
        ON public.group_students FOR SELECT
        USING (auth.uid() IS NOT NULL);
    END IF;
  END IF;
END $outer$;

-- Individual lessons
DO $outer$
BEGIN
  IF to_regclass('public.individual_lessons') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname='public' AND tablename='individual_lessons' 
        AND cmd='SELECT' AND policyname='Authenticated users can view all individual lessons'
    ) THEN
      CREATE POLICY "Authenticated users can view all individual lessons"
        ON public.individual_lessons FOR SELECT
        USING (auth.uid() IS NOT NULL);
    END IF;
  END IF;
END $outer$;

-- Lead status history
DO $outer$
BEGIN
  IF to_regclass('public.lead_status_history') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname='public' AND tablename='lead_status_history' 
        AND cmd='SELECT' AND policyname='Authenticated users can view all lead status history'
    ) THEN
      CREATE POLICY "Authenticated users can view all lead status history"
        ON public.lead_status_history FOR SELECT
        USING (auth.uid() IS NOT NULL);
    END IF;
  END IF;
END $outer$;

-- Learning groups
DO $outer$
BEGIN
  IF to_regclass('public.learning_groups') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname='public' AND tablename='learning_groups' 
        AND cmd='SELECT' AND policyname='Authenticated users can view all learning groups'
    ) THEN
      CREATE POLICY "Authenticated users can view all learning groups"
        ON public.learning_groups FOR SELECT
        USING (auth.uid() IS NOT NULL);
    END IF;
  END IF;
END $outer$;

-- Lesson sessions
DO $outer$
BEGIN
  IF to_regclass('public.lesson_sessions') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname='public' AND tablename='lesson_sessions' 
        AND cmd='SELECT' AND policyname='Authenticated users can view all lesson sessions'
    ) THEN
      CREATE POLICY "Authenticated users can view all lesson sessions"
        ON public.lesson_sessions FOR SELECT
        USING (auth.uid() IS NOT NULL);
    END IF;
  END IF;
END $outer$;

-- Students
DO $outer$
BEGIN
  IF to_regclass('public.students') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname='public' AND tablename='students' 
        AND cmd='SELECT' AND policyname='Authenticated users can view all students'
    ) THEN
      CREATE POLICY "Authenticated users can view all students"
        ON public.students FOR SELECT
        USING (auth.uid() IS NOT NULL);
    END IF;
  END IF;
END $outer$;