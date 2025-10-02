-- Ensure RLS is enabled and support upsert uniqueness
ALTER TABLE public.individual_lesson_sessions ENABLE ROW LEVEL SECURITY;

-- Create a unique index to support upsert by (individual_lesson_id, lesson_date)
CREATE UNIQUE INDEX IF NOT EXISTS unique_lesson_date_per_lesson
ON public.individual_lesson_sessions (individual_lesson_id, lesson_date);

-- Recreate policies to also allow creator-based access
DROP POLICY IF EXISTS "Users can view lesson sessions" ON public.individual_lesson_sessions;
DROP POLICY IF EXISTS "Users can insert lesson sessions for their branches" ON public.individual_lesson_sessions;
DROP POLICY IF EXISTS "Users can update lesson sessions for their branches" ON public.individual_lesson_sessions;
DROP POLICY IF EXISTS "Users can delete lesson sessions for their branches" ON public.individual_lesson_sessions;

-- SELECT policy
CREATE POLICY "Users can view lesson sessions"
  ON public.individual_lesson_sessions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT policy: admin, branch access, or creator of the row
CREATE POLICY "Users can insert lesson sessions for their branches"
  ON public.individual_lesson_sessions
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      public.has_role(auth.uid(), 'admin') OR
      individual_lesson_sessions.created_by = auth.uid() OR
      EXISTS (
        SELECT 1
        FROM public.individual_lessons il
        WHERE il.id = individual_lesson_sessions.individual_lesson_id
          AND il.branch = ANY (public.get_user_branches(auth.uid()))
      )
    )
  );

-- UPDATE policy: admin, branch access, or creator
CREATE POLICY "Users can update lesson sessions for their branches"
  ON public.individual_lesson_sessions
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND (
      public.has_role(auth.uid(), 'admin') OR
      individual_lesson_sessions.created_by = auth.uid() OR
      EXISTS (
        SELECT 1
        FROM public.individual_lessons il
        WHERE il.id = individual_lesson_sessions.individual_lesson_id
          AND il.branch = ANY (public.get_user_branches(auth.uid()))
      )
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      public.has_role(auth.uid(), 'admin') OR
      individual_lesson_sessions.created_by = auth.uid() OR
      EXISTS (
        SELECT 1
        FROM public.individual_lessons il
        WHERE il.id = individual_lesson_sessions.individual_lesson_id
          AND il.branch = ANY (public.get_user_branches(auth.uid()))
      )
    )
  );

-- DELETE policy: admin, branch access, or creator
CREATE POLICY "Users can delete lesson sessions for their branches"
  ON public.individual_lesson_sessions
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND (
      public.has_role(auth.uid(), 'admin') OR
      individual_lesson_sessions.created_by = auth.uid() OR
      EXISTS (
        SELECT 1
        FROM public.individual_lessons il
        WHERE il.id = individual_lesson_sessions.individual_lesson_id
          AND il.branch = ANY (public.get_user_branches(auth.uid()))
      )
    )
  );