-- Fix infinite recursion in students table policies by removing problematic policy

-- Drop the recursive policy that causes infinite loop
DROP POLICY IF EXISTS "students_own" ON public.students;

-- Drop duplicate/conflicting open policies that are too permissive
DROP POLICY IF EXISTS "open_students_delete" ON public.students;
DROP POLICY IF EXISTS "open_students_insert" ON public.students;
DROP POLICY IF EXISTS "open_students_select" ON public.students;
DROP POLICY IF EXISTS "open_students_update" ON public.students;

-- Drop overly permissive auth policy
DROP POLICY IF EXISTS "auth_manage_students" ON public.students;