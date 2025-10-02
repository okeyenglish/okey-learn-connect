-- Refresh RLS policies for individual_lesson_sessions to use get_user_branches()
-- This avoids dependence on profiles.branch being set and fixes legitimate inserts/updates for users with branch access

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view lesson sessions" ON public.individual_lesson_sessions;
DROP POLICY IF EXISTS "Users can insert lesson sessions for their branches" ON public.individual_lesson_sessions;
DROP POLICY IF EXISTS "Users can update lesson sessions for their branches" ON public.individual_lesson_sessions;
DROP POLICY IF EXISTS "Users can delete lesson sessions for their branches" ON public.individual_lesson_sessions;

-- View policy (any authenticated user)
CREATE POLICY "Users can view lesson sessions"
  ON public.individual_lesson_sessions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Insert policy: admins or users with access to the lesson's branch (via get_user_branches)
CREATE POLICY "Users can insert lesson sessions for their branches"
  ON public.individual_lesson_sessions
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      public.has_role(auth.uid(), 'admin') OR
      EXISTS (
        SELECT 1
        FROM public.individual_lessons il
        WHERE il.id = individual_lesson_sessions.individual_lesson_id
          AND il.branch = ANY (public.get_user_branches(auth.uid()))
      )
    )
  );

-- Update policy: same access rule
CREATE POLICY "Users can update lesson sessions for their branches"
  ON public.individual_lesson_sessions
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND (
      public.has_role(auth.uid(), 'admin') OR
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
      EXISTS (
        SELECT 1
        FROM public.individual_lessons il
        WHERE il.id = individual_lesson_sessions.individual_lesson_id
          AND il.branch = ANY (public.get_user_branches(auth.uid()))
      )
    )
  );

-- Delete policy: same access rule
CREATE POLICY "Users can delete lesson sessions for their branches"
  ON public.individual_lesson_sessions
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND (
      public.has_role(auth.uid(), 'admin') OR
      EXISTS (
        SELECT 1
        FROM public.individual_lessons il
        WHERE il.id = individual_lesson_sessions.individual_lesson_id
          AND il.branch = ANY (public.get_user_branches(auth.uid()))
      )
    )
  );