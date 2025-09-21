-- Создаем перечисления для дней недели и статусов занятий
CREATE TYPE day_of_week AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
CREATE TYPE lesson_status AS ENUM ('scheduled', 'cancelled', 'completed', 'rescheduled');

-- Таблица для конкретных занятий (сессий)
CREATE TABLE public.lesson_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.learning_groups(id) ON DELETE CASCADE,
  teacher_name TEXT NOT NULL,
  branch TEXT NOT NULL,
  classroom TEXT NOT NULL,
  lesson_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  day_of_week day_of_week NOT NULL,
  status lesson_status NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Создаем индексы для быстрого поиска конфликтов
CREATE INDEX idx_lesson_sessions_teacher_time ON public.lesson_sessions (teacher_name, lesson_date, start_time, end_time);
CREATE INDEX idx_lesson_sessions_classroom_time ON public.lesson_sessions (branch, classroom, lesson_date, start_time, end_time);
CREATE INDEX idx_lesson_sessions_date ON public.lesson_sessions (lesson_date);
CREATE INDEX idx_lesson_sessions_group ON public.lesson_sessions (group_id);

-- Функция для проверки конфликтов преподавателей
CREATE OR REPLACE FUNCTION public.check_teacher_conflict(
  p_teacher_name TEXT,
  p_lesson_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_session_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для проверки конфликтов аудиторий
CREATE OR REPLACE FUNCTION public.check_classroom_conflict(
  p_branch TEXT,
  p_classroom TEXT,
  p_lesson_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_session_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для получения конфликтов при создании/редактировании занятия
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
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS политики для lesson_sessions
ALTER TABLE public.lesson_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lesson sessions from their branches"
ON public.lesson_sessions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (
      lesson_sessions.branch = p.branch OR
      EXISTS (
        SELECT 1 FROM public.manager_branches mb
        WHERE mb.manager_id = auth.uid()
        AND mb.branch = lesson_sessions.branch
      )
    )
  )
);

CREATE POLICY "Users can insert lesson sessions to their branches"
ON public.lesson_sessions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (
      lesson_sessions.branch = p.branch OR
      EXISTS (
        SELECT 1 FROM public.manager_branches mb
        WHERE mb.manager_id = auth.uid()
        AND mb.branch = lesson_sessions.branch
      )
    )
  )
);

CREATE POLICY "Users can update lesson sessions from their branches"
ON public.lesson_sessions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (
      lesson_sessions.branch = p.branch OR
      EXISTS (
        SELECT 1 FROM public.manager_branches mb
        WHERE mb.manager_id = auth.uid()
        AND mb.branch = lesson_sessions.branch
      )
    )
  )
);

CREATE POLICY "Users can delete lesson sessions from their branches"
ON public.lesson_sessions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (
      lesson_sessions.branch = p.branch OR
      EXISTS (
        SELECT 1 FROM public.manager_branches mb
        WHERE mb.manager_id = auth.uid()
        AND mb.branch = lesson_sessions.branch
      )
    )
  )
);

-- Триггер для обновления updated_at
CREATE TRIGGER update_lesson_sessions_updated_at
BEFORE UPDATE ON public.lesson_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();