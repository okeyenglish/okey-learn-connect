-- Fix infinite recursion in students table policies

-- Drop problematic recursive policy
DROP POLICY IF EXISTS "students_own" ON public.students;

-- Drop duplicate open policies
DROP POLICY IF EXISTS "open_students_delete" ON public.students;
DROP POLICY IF EXISTS "open_students_insert" ON public.students;
DROP POLICY IF EXISTS "open_students_select" ON public.students;
DROP POLICY IF EXISTS "open_students_update" ON public.students;

-- Drop overly permissive auth policy
DROP POLICY IF EXISTS "auth_manage_students" ON public.students;

-- Keep existing good policies (admin and authenticated view)
-- These already exist and don't need recreation

-- Create non-recursive policy for users to manage students from their branches
CREATE POLICY "Users can manage students from their branches"
ON public.students
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'branch_manager'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.family_groups fg
    WHERE fg.id = students.family_group_id
    AND fg.branch IN (SELECT unnest(get_user_branches(auth.uid())))
  )
);

-- Create simple policy for students to view their own data
-- Using direct phone match from user metadata instead of recursive join
CREATE POLICY "Students can view their own data"
ON public.students
FOR SELECT
USING (
  has_role(auth.uid(), 'student'::app_role) AND
  phone = (SELECT phone FROM public.profiles WHERE id = auth.uid())
);