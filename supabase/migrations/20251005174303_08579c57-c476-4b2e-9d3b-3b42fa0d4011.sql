-- Harden logging trigger to never block lesson creation; swallow errors safely
CREATE OR REPLACE FUNCTION public.log_lesson_session_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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