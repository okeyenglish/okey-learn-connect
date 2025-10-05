-- Найдем и исправим триггер, который вызывает ошибку FOREACH
-- Скорее всего есть триггер, который автоматически добавляет студентов группы

-- Сначала проверим, есть ли функция, которая автоматически добавляет студентов
-- при создании lesson_session и исправим её

-- Создаем или заменяем функцию для автоматического добавления студентов группы в занятие
CREATE OR REPLACE FUNCTION public.auto_add_group_students_to_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_ids UUID[];
  student_id UUID;
BEGIN
  -- Если это групповое занятие (есть group_id)
  IF NEW.group_id IS NOT NULL THEN
    -- Получаем активных студентов группы
    SELECT ARRAY_AGG(student_id) 
    INTO student_ids
    FROM public.group_students
    WHERE group_id = NEW.group_id 
    AND status = 'active';
    
    -- ВАЖНО: Проверяем, что массив не NULL и не пустой
    IF student_ids IS NOT NULL AND array_length(student_ids, 1) > 0 THEN
      -- Добавляем каждого студента в занятие
      FOREACH student_id IN ARRAY student_ids
      LOOP
        INSERT INTO public.student_lesson_sessions (
          student_id,
          lesson_session_id,
          attendance_status,
          created_at
        ) VALUES (
          student_id,
          NEW.id,
          'scheduled',
          now()
        )
        ON CONFLICT (student_id, lesson_session_id) DO NOTHING;
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Удаляем старый триггер если он есть
DROP TRIGGER IF EXISTS trigger_auto_add_group_students ON public.lesson_sessions;

-- Создаем новый триггер
CREATE TRIGGER trigger_auto_add_group_students
AFTER INSERT ON public.lesson_sessions
FOR EACH ROW
EXECUTE FUNCTION public.auto_add_group_students_to_session();