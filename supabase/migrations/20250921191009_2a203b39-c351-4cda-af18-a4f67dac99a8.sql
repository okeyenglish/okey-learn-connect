-- Исправляем функции для установки правильного search_path

-- Функция для проверки конфликтов преподавателей (исправленная)
CREATE OR REPLACE FUNCTION public.check_teacher_conflict(
  p_teacher_name TEXT,
  p_lesson_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_session_id UUID DEFAULT NULL
) RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.lesson_sessions
    WHERE teacher_name = p_teacher_name
    AND lesson_date = p_lesson_date
    AND status != 'cancelled'
    AND (p_exclude_session_id IS NULL OR id != p_exclude_session_id)
    AND (
      (start_time <= p_start_time AND end_time > p_start_time) OR
      (start_time < p_end_time AND end_time >= p_end_time) OR
      (start_time >= p_start_time AND end_time <= p_end_time)
    )
  );
END;
$$;

-- Функция для проверки конфликтов аудиторий (исправленная)
CREATE OR REPLACE FUNCTION public.check_classroom_conflict(
  p_branch TEXT,
  p_classroom TEXT,
  p_lesson_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_session_id UUID DEFAULT NULL
) RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.lesson_sessions
    WHERE branch = p_branch
    AND classroom = p_classroom
    AND lesson_date = p_lesson_date
    AND status != 'cancelled'
    AND (p_exclude_session_id IS NULL OR id != p_exclude_session_id)
    AND (
      (start_time <= p_start_time AND end_time > p_start_time) OR
      (start_time < p_end_time AND end_time >= p_end_time) OR
      (start_time >= p_start_time AND end_time <= p_end_time)
    )
  );
END;
$$;

-- Функция для получения конфликтов при создании/редактировании занятия (исправленная)
CREATE OR REPLACE FUNCTION public.get_schedule_conflicts(
  p_teacher_name TEXT,
  p_branch TEXT,
  p_classroom TEXT,
  p_lesson_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_session_id UUID DEFAULT NULL
) RETURNS TABLE(
  conflict_type TEXT,
  conflicting_teacher TEXT,
  conflicting_classroom TEXT,
  conflicting_group_id UUID,
  conflicting_time_range TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Проверка конфликтов преподавателя
  RETURN QUERY
  SELECT 
    'teacher'::TEXT as conflict_type,
    ls.teacher_name as conflicting_teacher,
    ls.classroom as conflicting_classroom,
    ls.group_id as conflicting_group_id,
    (ls.start_time::TEXT || ' - ' || ls.end_time::TEXT) as conflicting_time_range
  FROM public.lesson_sessions ls
  WHERE ls.teacher_name = p_teacher_name
    AND ls.lesson_date = p_lesson_date
    AND ls.status != 'cancelled'
    AND (p_exclude_session_id IS NULL OR ls.id != p_exclude_session_id)
    AND (
      (ls.start_time <= p_start_time AND ls.end_time > p_start_time) OR
      (ls.start_time < p_end_time AND ls.end_time >= p_end_time) OR
      (ls.start_time >= p_start_time AND ls.end_time <= p_end_time)
    );

  -- Проверка конфликтов аудитории
  RETURN QUERY
  SELECT 
    'classroom'::TEXT as conflict_type,
    ls.teacher_name as conflicting_teacher,
    ls.classroom as conflicting_classroom,
    ls.group_id as conflicting_group_id,
    (ls.start_time::TEXT || ' - ' || ls.end_time::TEXT) as conflicting_time_range
  FROM public.lesson_sessions ls
  WHERE ls.branch = p_branch
    AND ls.classroom = p_classroom
    AND ls.lesson_date = p_lesson_date
    AND ls.status != 'cancelled'
    AND (p_exclude_session_id IS NULL OR ls.id != p_exclude_session_id)
    AND (
      (ls.start_time <= p_start_time AND ls.end_time > p_start_time) OR
      (ls.start_time < p_end_time AND ls.end_time >= p_end_time) OR
      (ls.start_time >= p_start_time AND ls.end_time <= p_end_time)
    );
END;
$$;