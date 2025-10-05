-- Make auto_add_group_students_to_session robust and non-blocking
CREATE OR REPLACE FUNCTION public.auto_add_group_students_to_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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