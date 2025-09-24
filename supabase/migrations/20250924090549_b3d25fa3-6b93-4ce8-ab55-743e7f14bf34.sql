-- Update the get_user_role function to handle all 5 roles with priority
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'methodist' THEN 2
      WHEN 'manager' THEN 3
      WHEN 'teacher' THEN 4
      WHEN 'student' THEN 5
    END
  LIMIT 1
$$;