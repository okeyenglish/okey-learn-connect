-- Fix ambiguous student_id error and null arrays in lesson session logging trigger
CREATE OR REPLACE FUNCTION public.log_lesson_session_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  student_ids UUID[] := '{}';
  v_student_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Collect students linked to this session (may be empty)
    SELECT COALESCE(ARRAY_AGG(sls.student_id), '{}') INTO student_ids
    FROM public.student_lesson_sessions sls
    WHERE sls.lesson_session_id = NEW.id;

    IF array_length(student_ids, 1) > 0 THEN
      FOREACH v_student_id IN ARRAY student_ids LOOP
        INSERT INTO public.student_history (
          student_id, event_type, event_category, title, description, new_value, changed_by
        ) VALUES (
          v_student_id,
          'schedule',
          'lessons',
          'Новое занятие',
          'Запланировано занятие на ' || to_char(NEW.lesson_date, 'DD.MM.YYYY') || ' в ' || NEW.start_time::TEXT,
          jsonb_build_object('lesson_session_id', NEW.id, 'date', NEW.lesson_date, 'time', NEW.start_time, 'status', NEW.status),
          auth.uid()
        );
      END LOOP;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT COALESCE(ARRAY_AGG(sls.student_id), '{}') INTO student_ids
    FROM public.student_lesson_sessions sls
    WHERE sls.lesson_session_id = NEW.id;

    IF (OLD.lesson_date != NEW.lesson_date OR OLD.start_time != NEW.start_time OR OLD.end_time != NEW.end_time) THEN
      FOREACH v_student_id IN ARRAY student_ids LOOP
        INSERT INTO public.student_history (
          student_id, event_type, event_category, title, description, old_value, new_value, changed_by
        ) VALUES (
          v_student_id,
          'schedule',
          'lessons',
          'Изменение расписания',
          'Время занятия было изменено',
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
          'schedule',
          'lessons',
          'Изменение статуса занятия',
          'Статус занятия был изменен',
          jsonb_build_object('status', OLD.status),
          jsonb_build_object('status', NEW.status),
          auth.uid()
        );
      END LOOP;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT COALESCE(ARRAY_AGG(sls.student_id), '{}') INTO student_ids
    FROM public.student_lesson_sessions sls
    WHERE sls.lesson_session_id = OLD.id;

    FOREACH v_student_id IN ARRAY student_ids LOOP
      INSERT INTO public.student_history (
        student_id, event_type, event_category, title, description, old_value, changed_by
      ) VALUES (
        v_student_id,
        'schedule',
        'lessons',
        'Удаление занятия',
        'Занятие было удалено',
        jsonb_build_object('lesson_session_id', OLD.id, 'date', OLD.lesson_date, 'time', OLD.start_time),
        auth.uid()
      );
    END LOOP;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;