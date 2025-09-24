-- Создаем функцию для связи студентов с пользователями через номер телефона
CREATE OR REPLACE FUNCTION public.link_student_to_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- Создаем триггер для автоматической связки студентов при обновлении профиля
CREATE OR REPLACE TRIGGER link_student_on_profile_update
  AFTER UPDATE OF phone ON public.profiles
  FOR EACH ROW
  WHEN (NEW.phone IS NOT NULL AND NEW.phone != OLD.phone)
  EXECUTE FUNCTION public.link_student_to_user();

-- Создаем функцию для получения студента по ID пользователя
CREATE OR REPLACE FUNCTION public.get_student_by_user_id(_user_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  first_name text,
  last_name text,
  middle_name text,
  age integer,
  phone text,
  family_group_id uuid,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT s.id, s.name, s.first_name, s.last_name, s.middle_name, 
         s.age, s.phone, s.family_group_id, s.status::text, 
         s.created_at, s.updated_at
  FROM public.students s
  JOIN public.profiles p ON p.phone = s.phone
  WHERE p.id = _user_id
  LIMIT 1;
$$;

-- Обновляем RLS политики для students, чтобы student мог видеть свои данные
CREATE POLICY "Students can view their own data"
ON public.students
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.phone = students.phone 
    AND p.id = auth.uid()
    AND ur.role = 'student'
  )
);

-- Обновляем RLS политики для student_courses
CREATE POLICY "Students can view their own courses"
ON public.student_courses
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT s.id FROM public.students s
    JOIN public.profiles p ON p.phone = s.phone
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.id = auth.uid() AND ur.role = 'student'
  )
);

-- Обновляем RLS политики для individual_lessons
CREATE POLICY "Students can view their own individual lessons"
ON public.individual_lessons
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT s.id FROM public.students s
    JOIN public.profiles p ON p.phone = s.phone  
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.id = auth.uid() AND ur.role = 'student'
  )
);

-- Обновляем RLS политики для student_lesson_sessions
CREATE POLICY "Students can view their own lesson sessions"
ON public.student_lesson_sessions
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT s.id FROM public.students s
    JOIN public.profiles p ON p.phone = s.phone
    JOIN public.user_roles ur ON ur.user_id = p.id  
    WHERE p.id = auth.uid() AND ur.role = 'student'
  )
);