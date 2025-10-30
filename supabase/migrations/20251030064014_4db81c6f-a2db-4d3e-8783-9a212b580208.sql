-- ============================================
-- ПРИОРИТЕТ 1 (финал): ИСПРАВЛЕНИЕ ОСТАВШИХСЯ СЛОЖНЫХ ФУНКЦИЙ
-- ============================================

-- 4.1 Функция логирования событий занятий
CREATE OR REPLACE FUNCTION public.log_lesson_session_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_ids UUID[] := '{}';
  v_student_id UUID;
  v_group_id UUID;
BEGIN
  BEGIN
    IF TG_OP = 'INSERT' THEN
      v_group_id := NEW.group_id;
      IF v_group_id IS NOT NULL THEN
        SELECT COALESCE(ARRAY_AGG(gs.student_id), '{}') INTO student_ids
        FROM public.group_students gs
        WHERE gs.group_id = v_group_id AND gs.status = 'active';
      END IF;

      IF array_length(student_ids, 1) > 0 THEN
        FOREACH v_student_id IN ARRAY student_ids LOOP
          INSERT INTO public.student_history (
            student_id, event_type, event_category, title, description, new_value, changed_by
          ) VALUES (
            v_student_id,
            'schedule', 'lessons', 'Новое занятие',
            'Запланировано занятие на ' || to_char(NEW.lesson_date, 'DD.MM.YYYY') || ' в ' || NEW.start_time::TEXT,
            jsonb_build_object('lesson_session_id', NEW.id, 'date', NEW.lesson_date, 'time', NEW.start_time, 'status', NEW.status),
            auth.uid()
          );
        END LOOP;
      END IF;

    ELSIF TG_OP = 'UPDATE' THEN
      v_group_id := NEW.group_id;
      IF v_group_id IS NOT NULL THEN
        SELECT COALESCE(ARRAY_AGG(gs.student_id), '{}') INTO student_ids
        FROM public.group_students gs
        WHERE gs.group_id = v_group_id AND gs.status = 'active';
      END IF;

      IF (OLD.lesson_date != NEW.lesson_date OR OLD.start_time != NEW.start_time OR OLD.end_time != NEW.end_time) THEN
        FOREACH v_student_id IN ARRAY student_ids LOOP
          INSERT INTO public.student_history (
            student_id, event_type, event_category, title, description, old_value, new_value, changed_by
          ) VALUES (
            v_student_id,
            'schedule', 'lessons', 'Изменение расписания', 'Время занятия было изменено',
            jsonb_build_object('date', OLD.lesson_date, 'start_time', OLD.start_time, 'end_time', OLD.end_time),
            jsonb_build_object('date', NEW.lesson_date, 'start_time', NEW.start_time, 'end_time', NEW.end_time),
            auth.uid()
          );
        END LOOP;
      END IF;

      IF (OLD.status != NEW.status) THEN
        FOREACH v_student_id IN ARRAY student_ids LOOP
          INSERT INTO public.student_history (
            student_id, event_type, event_category, title, description, old_value, new_value, changed_by
          ) VALUES (
            v_student_id,
            'schedule', 'lessons', 'Изменение статуса занятия', 'Статус занятия был изменен',
            jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status), auth.uid()
          );
        END LOOP;
      END IF;

    ELSIF TG_OP = 'DELETE' THEN
      v_group_id := OLD.group_id;
      IF v_group_id IS NOT NULL THEN
        SELECT COALESCE(ARRAY_AGG(gs.student_id), '{}') INTO student_ids
        FROM public.group_students gs
        WHERE gs.group_id = v_group_id AND gs.status = 'active';
      END IF;

      IF array_length(student_ids, 1) > 0 THEN
        FOREACH v_student_id IN ARRAY student_ids LOOP
          INSERT INTO public.student_history (
            student_id, event_type, event_category, title, description, old_value, changed_by
          ) VALUES (
            v_student_id,
            'schedule', 'lessons', 'Удаление занятия', 'Занятие было удалено',
            jsonb_build_object('lesson_session_id', OLD.id, 'date', OLD.lesson_date, 'time', OLD.start_time), auth.uid()
          );
        END LOOP;
      END IF;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    -- Never block main operation due to logging; just continue
    NULL;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4.2 Функция автодобавления студентов в занятие
CREATE OR REPLACE FUNCTION public.auto_add_group_students_to_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_ids UUID[] := '{}';
  v_student_id UUID;
BEGIN
  BEGIN
    IF NEW.group_id IS NOT NULL THEN
      SELECT COALESCE(ARRAY_AGG(gs.student_id), '{}')
      INTO v_student_ids
      FROM public.group_students gs
      WHERE gs.group_id = NEW.group_id AND gs.status = 'active';

      IF array_length(v_student_ids, 1) > 0 THEN
        FOREACH v_student_id IN ARRAY v_student_ids LOOP
          INSERT INTO public.student_lesson_sessions (
            student_id,
            lesson_session_id,
            attendance_status,
            created_at
          ) VALUES (
            v_student_id,
            NEW.id,
            'scheduled',
            now()
          )
          ON CONFLICT (student_id, lesson_session_id) DO NOTHING;
        END LOOP;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Never block main insert; just skip auto-adding on error
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- 4.3 Функции конфликтов расписания
CREATE OR REPLACE FUNCTION public.get_schedule_conflicts(
  p_teacher_name text, 
  p_branch text, 
  p_classroom text, 
  p_lesson_date date, 
  p_start_time time without time zone, 
  p_end_time time without time zone, 
  p_exclude_session_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  conflict_type text, 
  conflicting_teacher text, 
  conflicting_classroom text, 
  conflicting_group_id uuid, 
  conflicting_time_range text
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

CREATE OR REPLACE FUNCTION public.get_student_schedule_conflicts(
  p_student_id uuid, 
  p_lesson_date date, 
  p_start_time time without time zone, 
  p_end_time time without time zone, 
  p_exclude_session_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  conflict_session_id uuid, 
  conflicting_group_name text, 
  conflicting_teacher text, 
  conflicting_classroom text, 
  conflicting_branch text, 
  conflicting_time_range text, 
  lesson_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ls.id as conflict_session_id,
    COALESCE(lg.name, 'Индивидуальное занятие') as conflicting_group_name,
    ls.teacher_name as conflicting_teacher,
    ls.classroom as conflicting_classroom,
    ls.branch as conflicting_branch,
    (ls.start_time::TEXT || ' - ' || ls.end_time::TEXT) as conflicting_time_range,
    CASE 
      WHEN lg.id IS NOT NULL THEN 'group'
      ELSE 'individual'
    END as lesson_type
  FROM public.student_lesson_sessions sls
  JOIN public.lesson_sessions ls ON ls.id = sls.lesson_session_id
  LEFT JOIN public.learning_groups lg ON lg.id = ls.group_id
  WHERE sls.student_id = p_student_id
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

CREATE OR REPLACE FUNCTION public.check_multiple_students_conflicts(
  p_student_ids uuid[], 
  p_lesson_date date, 
  p_start_time time without time zone, 
  p_end_time time without time zone, 
  p_exclude_session_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  student_id uuid, 
  has_conflict boolean, 
  conflict_details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_uuid UUID;
  conflict_data JSONB;
BEGIN
  FOREACH student_uuid IN ARRAY p_student_ids
  LOOP
    SELECT jsonb_agg(
      jsonb_build_object(
        'session_id', conflict_session_id,
        'group_name', conflicting_group_name,
        'teacher', conflicting_teacher,
        'classroom', conflicting_classroom,
        'branch', conflicting_branch,
        'time_range', conflicting_time_range,
        'lesson_type', lesson_type
      )
    )
    INTO conflict_data
    FROM public.get_student_schedule_conflicts(
      student_uuid,
      p_lesson_date,
      p_start_time,
      p_end_time,
      p_exclude_session_id
    );
    
    RETURN QUERY
    SELECT 
      student_uuid,
      (conflict_data IS NOT NULL AND jsonb_array_length(conflict_data) > 0),
      COALESCE(conflict_data, '[]'::jsonb);
  END LOOP;
END;
$$;

-- 4.4 Функция генерации расписания курса
CREATE OR REPLACE FUNCTION public.generate_course_schedule(
  p_group_id uuid, 
  p_course_id uuid, 
  p_start_date date, 
  p_schedule_days text[], 
  p_start_time time without time zone, 
  p_end_time time without time zone, 
  p_teacher_name text, 
  p_classroom text, 
  p_branch text, 
  p_total_lessons integer DEFAULT 80
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lesson_date date := p_start_date;
  lesson_count integer := 0;
  current_day text;
  lesson_rec record;
BEGIN
  -- Удаляем существующие занятия группы если они есть
  DELETE FROM public.lesson_sessions WHERE group_id = p_group_id;
  
  WHILE lesson_count < p_total_lessons LOOP
    -- Получаем день недели (0=воскресенье, 1=понедельник и т.д.)
    SELECT CASE 
      WHEN EXTRACT(DOW FROM lesson_date) = 0 THEN 'sunday'
      WHEN EXTRACT(DOW FROM lesson_date) = 1 THEN 'monday'
      WHEN EXTRACT(DOW FROM lesson_date) = 2 THEN 'tuesday'
      WHEN EXTRACT(DOW FROM lesson_date) = 3 THEN 'wednesday'
      WHEN EXTRACT(DOW FROM lesson_date) = 4 THEN 'thursday'
      WHEN EXTRACT(DOW FROM lesson_date) = 5 THEN 'friday'
      WHEN EXTRACT(DOW FROM lesson_date) = 6 THEN 'saturday'
    END INTO current_day;
    
    -- Проверяем, входит ли этот день в расписание группы
    IF current_day = ANY(p_schedule_days) THEN
      lesson_count := lesson_count + 1;
      
      -- Получаем соответствующий урок из курса
      SELECT l.id, l.lesson_number, l.title INTO lesson_rec
      FROM public.lessons l 
      JOIN public.course_units cu ON cu.id = l.unit_id 
      WHERE cu.course_id = p_course_id 
      ORDER BY cu.unit_number, l.lesson_number
      LIMIT 1 OFFSET (lesson_count - 1);
      
      -- Создаем занятие
      INSERT INTO public.lesson_sessions (
        group_id,
        lesson_date,
        start_time,
        end_time,
        teacher_name,
        classroom,
        branch,
        day_of_week,
        lesson_number,
        course_lesson_id,
        status,
        notes
      ) VALUES (
        p_group_id,
        lesson_date,
        p_start_time,
        p_end_time,
        p_teacher_name,
        p_classroom,
        p_branch,
        current_day::day_of_week,
        lesson_count,
        lesson_rec.id,
        'scheduled',
        CASE 
          WHEN lesson_rec.title IS NOT NULL 
          THEN 'Урок ' || lesson_count || ': ' || lesson_rec.title
          ELSE 'Урок ' || lesson_count
        END
      );
    END IF;
    
    -- Переходим к следующему дню
    lesson_date := lesson_date + INTERVAL '1 day';
  END LOOP;
  
  -- Обновляем статус группы
  UPDATE public.learning_groups 
  SET 
    lessons_generated = true,
    course_id = p_course_id,
    course_start_date = p_start_date,
    total_lessons = p_total_lessons
  WHERE id = p_group_id;
END;
$$;

-- Логирование завершения миграции
DO $$
BEGIN
  RAISE NOTICE '✅ SECURITY PATCH FINAL APPLIED:';
  RAISE NOTICE '   - Fixed all remaining complex functions';
  RAISE NOTICE '   - All custom functions now have search_path protection';
  RAISE NOTICE '   - Remaining warnings are from extensions (pg_trgm, vector)';
  RAISE NOTICE '   - Migration completed at: %', now();
END $$;