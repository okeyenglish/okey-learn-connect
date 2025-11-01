-- Fix infinite recursion in RLS policy for public.teachers
-- 1) Drop problematic policies
DROP POLICY IF EXISTS "Преподаватели видят коллег" ON public.teachers;
DROP POLICY IF EXISTS "Преподаватели видят коллег из своих филиалов" ON public.teachers;

-- 2) Helper function that checks if user has access to a branch (no reads from teachers table)
CREATE OR REPLACE FUNCTION public.user_has_branch(_branch text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN _branch IS NULL OR _branch = '' THEN FALSE
    ELSE _branch = ANY(public.get_user_branches(auth.uid()))
  END;
$$;

-- 3) Create a clean, non-recursive policy using only helper + role check
CREATE POLICY "Доступ к преподавателям по филиалам"
ON public.teachers
FOR SELECT
TO authenticated
USING (
  public.user_has_branch(teachers.branch)
  OR public.get_user_role(auth.uid()) IN ('admin','branch_manager')
);
