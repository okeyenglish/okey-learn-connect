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

-- Функция для автоматического создания занятий на основе расписания группы
CREATE OR REPLACE FUNCTION public.generate_group_sessions(
  p_group_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS INTEGER AS $$
DECLARE
  group_record RECORD;
  current_date DATE;
  day_name TEXT;
  sessions_created INTEGER := 0;
  day_schedule RECORD;
BEGIN
  -- Получаем данные группы
  SELECT * INTO group_record FROM public.learning_groups WHERE id = p_group_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Группа не найдена';
  END IF;

  -- Если у группы нет расписания, возвращаем 0
  IF group_record.schedule_days IS NULL OR array_length(group_record.schedule_days, 1) IS NULL THEN
    RETURN 0;
  END IF;

  -- Парсим время из schedule_time
  FOR day_schedule IN (
    SELECT 
      unnest(group_record.schedule_days) as day,
      CASE 
        WHEN group_record.schedule_time LIKE '%-%' THEN
          split_part(group_record.schedule_time, '-', 1)::TIME
        ELSE '09:00'::TIME
      END as start_time,
      CASE 
        WHEN group_record.schedule_time LIKE '%-%' THEN
          split_part(group_record.schedule_time, '-', 2)::TIME
        ELSE '10:30'::TIME
      END as end_time
  ) LOOP
    
    current_date := p_start_date;
    
    WHILE current_date <= p_end_date LOOP
      -- Получаем название дня недели на русском
      day_name := CASE EXTRACT(DOW FROM current_date)
        WHEN 1 THEN 'пн'
        WHEN 2 THEN 'вт'  
        WHEN 3 THEN 'ср'
        WHEN 4 THEN 'чт'
        WHEN 5 THEN 'пт'
        WHEN 6 THEN 'сб'
        WHEN 0 THEN 'вс'
      END;
      
      -- Проверяем, совпадает ли день недели с расписанием группы
      IF day_schedule.day = day_name THEN
        -- Проверяем конфликты перед созданием занятия
        IF NOT public.check_teacher_conflict(
          group_record.responsible_teacher,
          current_date,
          day_schedule.start_time,
          day_schedule.end_time
        ) AND NOT public.check_classroom_conflict(
          group_record.branch,
          group_record.schedule_room,
          current_date,
          day_schedule.start_time,
          day_schedule.end_time
        ) THEN
          -- Создаем занятие
          INSERT INTO public.lesson_sessions (
            group_id,
            teacher_name,
            branch,
            classroom,
            lesson_date,
            start_time,
            end_time,
            day_of_week,
            status
          ) VALUES (
            p_group_id,
            group_record.responsible_teacher,
            group_record.branch,
            group_record.schedule_room,
            current_date,
            day_schedule.start_time,
            day_schedule.end_time,
            CASE day_name
              WHEN 'пн' THEN 'monday'::day_of_week
              WHEN 'вт' THEN 'tuesday'::day_of_week
              WHEN 'ср' THEN 'wednesday'::day_of_week
              WHEN 'чт' THEN 'thursday'::day_of_week
              WHEN 'пт' THEN 'friday'::day_of_week
              WHEN 'сб' THEN 'saturday'::day_of_week
              WHEN 'вс' THEN 'sunday'::day_of_week
            END,
            'scheduled'
          );
          
          sessions_created := sessions_created + 1;
        END IF;
      END IF;
      
      current_date := current_date + INTERVAL '1 day';
    END LOOP;
  END LOOP;
  
  RETURN sessions_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для обновления updated_at
CREATE TRIGGER update_lesson_sessions_updated_at
BEFORE UPDATE ON public.lesson_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

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