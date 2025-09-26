-- Исправляем функции без установленного search_path для безопасности
-- Обновляем функцию handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email
  );
  
  -- Assign default 'manager' role to new users (they can be promoted to admin later)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'manager');
  
  RETURN NEW;
END;
$function$;

-- Обновляем функцию link_student_to_user
CREATE OR REPLACE FUNCTION public.link_student_to_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  student_record RECORD;
BEGIN
  -- Ищем студента по номеру телефона из профиля пользователя
  SELECT * INTO student_record 
  FROM public.students s 
  WHERE s.phone = NEW.phone 
  LIMIT 1;
  
  -- Если найден студент с таким номером телефона, назначаем роль student
  IF student_record.id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;