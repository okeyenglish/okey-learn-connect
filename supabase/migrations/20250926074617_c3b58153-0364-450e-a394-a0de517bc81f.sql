-- Третья часть: функции и базовые права доступа

-- Создаем функцию для проверки разрешений
CREATE OR REPLACE FUNCTION public.user_has_permission(
  _user_id UUID,
  _permission TEXT,
  _resource TEXT
) RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
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

-- Создаем функцию для получения всех ролей пользователя
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS app_role[]
LANGUAGE sql
STABLE SECURITY DEFINER
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

-- Обновляем функцию get_user_role для возврата высшей роли
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
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