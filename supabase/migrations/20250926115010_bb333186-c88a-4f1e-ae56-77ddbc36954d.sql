-- Fix missing user_has_permission function and ensure has_role function works properly

-- Create user_has_permission function that checks if user has specific permission
CREATE OR REPLACE FUNCTION public.user_has_permission(_user_id uuid, _permission text, _resource text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = _user_id
      AND rp.permission = _permission 
      AND (rp.resource = _resource OR rp.resource = 'all')
  );
$$;

-- Ensure get_user_roles function works properly  
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS app_role[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY(
    SELECT role 
    FROM public.user_roles
    WHERE user_id = _user_id
    ORDER BY 
      CASE role
        WHEN 'admin' THEN 1
        WHEN 'branch_manager' THEN 2
        WHEN 'methodist' THEN 3
        WHEN 'head_teacher' THEN 4
        WHEN 'sales_manager' THEN 5
        WHEN 'marketing_manager' THEN 6
        WHEN 'manager' THEN 7
        WHEN 'accountant' THEN 8
        WHEN 'receptionist' THEN 9
        WHEN 'teacher' THEN 10
        WHEN 'student' THEN 11
      END
  );
$$;

-- Ensure get_user_role function works properly
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'branch_manager' THEN 2
      WHEN 'methodist' THEN 3
      WHEN 'head_teacher' THEN 4
      WHEN 'sales_manager' THEN 5
      WHEN 'marketing_manager' THEN 6
      WHEN 'manager' THEN 7
      WHEN 'accountant' THEN 8
      WHEN 'receptionist' THEN 9
      WHEN 'teacher' THEN 10
      WHEN 'student' THEN 11
    END
  LIMIT 1;
$$;