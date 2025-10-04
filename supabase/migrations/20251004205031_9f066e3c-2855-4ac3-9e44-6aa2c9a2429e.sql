-- Create student history table
CREATE TABLE IF NOT EXISTS public.student_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  old_value JSONB,
  new_value JSONB,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for student_history
CREATE POLICY "Authenticated users can view student history"
  ON public.student_history
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert student history"
  ON public.student_history
  FOR INSERT
  WITH CHECK (true);

-- Index for faster queries
CREATE INDEX idx_student_history_student_id ON public.student_history(student_id);
CREATE INDEX idx_student_history_created_at ON public.student_history(created_at DESC);

-- Function to log student changes
CREATE OR REPLACE FUNCTION log_student_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Log name changes
    IF (OLD.first_name != NEW.first_name OR OLD.last_name != NEW.last_name OR OLD.middle_name != NEW.middle_name) THEN
      INSERT INTO public.student_history (student_id, event_type, event_category, title, description, old_value, new_value, changed_by)
      VALUES (
        NEW.id,
        'update',
        'personal_info',
        'Изменение ФИО',
        'ФИО студента было изменено',
        jsonb_build_object('first_name', OLD.first_name, 'last_name', OLD.last_name, 'middle_name', OLD.middle_name),
        jsonb_build_object('first_name', NEW.first_name, 'last_name', NEW.last_name, 'middle_name', NEW.middle_name),
        auth.uid()
      );
    END IF;

    -- Log age/DOB changes
    IF (OLD.age != NEW.age OR OLD.date_of_birth != NEW.date_of_birth) THEN
      INSERT INTO public.student_history (student_id, event_type, event_category, title, description, old_value, new_value, changed_by)
      VALUES (
        NEW.id,
        'update',
        'personal_info',
        'Изменение возраста/даты рождения',
        'Возраст или дата рождения были изменены',
        jsonb_build_object('age', OLD.age, 'date_of_birth', OLD.date_of_birth),
        jsonb_build_object('age', NEW.age, 'date_of_birth', NEW.date_of_birth),
        auth.uid()
      );
    END IF;

    -- Log phone changes
    IF (OLD.phone != NEW.phone) THEN
      INSERT INTO public.student_history (student_id, event_type, event_category, title, description, old_value, new_value, changed_by)
      VALUES (
        NEW.id,
        'update',
        'contact_info',
        'Изменение телефона',
        'Номер телефона был изменен',
        jsonb_build_object('phone', OLD.phone),
        jsonb_build_object('phone', NEW.phone),
        auth.uid()
      );
    END IF;

    -- Log status changes
    IF (OLD.status != NEW.status) THEN
      INSERT INTO public.student_history (student_id, event_type, event_category, title, description, old_value, new_value, changed_by)
      VALUES (
        NEW.id,
        'update',
        'status',
        'Изменение статуса',
        'Статус студента был изменен',
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status', NEW.status),
        auth.uid()
      );
    END IF;

    -- Log notes changes
    IF (OLD.notes IS DISTINCT FROM NEW.notes) THEN
      INSERT INTO public.student_history (student_id, event_type, event_category, title, description, old_value, new_value, changed_by)
      VALUES (
        NEW.id,
        'update',
        'notes',
        'Изменение заметок',
        'Заметки о студенте были изменены',
        jsonb_build_object('notes', OLD.notes),
        jsonb_build_object('notes', NEW.notes),
        auth.uid()
      );
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.student_history (student_id, event_type, event_category, title, description, new_value, changed_by)
    VALUES (
      NEW.id,
      'create',
      'student',
      'Студент создан',
      'Новый студент был добавлен в систему',
      jsonb_build_object('name', NEW.name, 'phone', NEW.phone, 'status', NEW.status),
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for student changes
CREATE TRIGGER trigger_log_student_changes
AFTER INSERT OR UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION log_student_change();

-- Function to log payment events
CREATE OR REPLACE FUNCTION log_payment_event()
RETURNS TRIGGER AS $$
DECLARE
  student_record RECORD;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get student info
    SELECT s.id INTO student_record
    FROM public.students s
    JOIN public.individual_lessons il ON il.student_id = s.id
    WHERE il.id = NEW.individual_lesson_id;

    IF student_record.id IS NOT NULL THEN
      INSERT INTO public.student_history (student_id, event_type, event_category, title, description, new_value, changed_by)
      VALUES (
        student_record.id,
        'payment',
        'financial',
        'Новая оплата',
        'Добавлена новая оплата на сумму ' || NEW.amount_paid || ' руб.',
        jsonb_build_object('payment_id', NEW.id, 'amount', NEW.amount_paid, 'payment_method', NEW.payment_method, 'lessons_count', NEW.lessons_count),
        auth.uid()
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Get student info
    SELECT s.id INTO student_record
    FROM public.students s
    JOIN public.individual_lessons il ON il.student_id = s.id
    WHERE il.id = OLD.individual_lesson_id;

    IF student_record.id IS NOT NULL THEN
      INSERT INTO public.student_history (student_id, event_type, event_category, title, description, old_value, changed_by)
      VALUES (
        student_record.id,
        'payment',
        'financial',
        'Удаление оплаты',
        'Оплата на сумму ' || OLD.amount_paid || ' руб. была удалена',
        jsonb_build_object('payment_id', OLD.id, 'amount', OLD.amount_paid, 'payment_method', OLD.payment_method, 'lessons_count', OLD.lessons_count),
        auth.uid()
      );
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for payment events
CREATE TRIGGER trigger_log_payment_events
AFTER INSERT OR DELETE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION log_payment_event();

-- Function to log lesson session events
CREATE OR REPLACE FUNCTION log_lesson_session_event()
RETURNS TRIGGER AS $$
DECLARE
  student_ids UUID[];
  student_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get student IDs from lesson session
    SELECT ARRAY_AGG(sls.student_id) INTO student_ids
    FROM public.student_lesson_sessions sls
    WHERE sls.lesson_session_id = NEW.id;

    -- Log for each student
    FOREACH student_id IN ARRAY student_ids
    LOOP
      INSERT INTO public.student_history (student_id, event_type, event_category, title, description, new_value, changed_by)
      VALUES (
        student_id,
        'schedule',
        'lessons',
        'Новое занятие',
        'Запланировано занятие на ' || to_char(NEW.lesson_date, 'DD.MM.YYYY') || ' в ' || NEW.start_time::TEXT,
        jsonb_build_object('lesson_session_id', NEW.id, 'date', NEW.lesson_date, 'time', NEW.start_time, 'status', NEW.status),
        auth.uid()
      );
    END LOOP;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Get student IDs
    SELECT ARRAY_AGG(sls.student_id) INTO student_ids
    FROM public.student_lesson_sessions sls
    WHERE sls.lesson_session_id = NEW.id;

    -- Log schedule changes
    IF (OLD.lesson_date != NEW.lesson_date OR OLD.start_time != NEW.start_time OR OLD.end_time != NEW.end_time) THEN
      FOREACH student_id IN ARRAY student_ids
      LOOP
        INSERT INTO public.student_history (student_id, event_type, event_category, title, description, old_value, new_value, changed_by)
        VALUES (
          student_id,
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

    -- Log status changes
    IF (OLD.status != NEW.status) THEN
      FOREACH student_id IN ARRAY student_ids
      LOOP
        INSERT INTO public.student_history (student_id, event_type, event_category, title, description, old_value, new_value, changed_by)
        VALUES (
          student_id,
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
    -- Get student IDs
    SELECT ARRAY_AGG(sls.student_id) INTO student_ids
    FROM public.student_lesson_sessions sls
    WHERE sls.lesson_session_id = OLD.id;

    FOREACH student_id IN ARRAY student_ids
    LOOP
      INSERT INTO public.student_history (student_id, event_type, event_category, title, description, old_value, changed_by)
      VALUES (
        student_id,
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for lesson session events
CREATE TRIGGER trigger_log_lesson_session_events
AFTER INSERT OR UPDATE OR DELETE ON public.lesson_sessions
FOR EACH ROW
EXECUTE FUNCTION log_lesson_session_event();

-- Function to log group enrollment
CREATE OR REPLACE FUNCTION log_group_enrollment()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.student_history (student_id, event_type, event_category, title, description, new_value, changed_by)
    VALUES (
      NEW.student_id,
      'enrollment',
      'groups',
      'Добавление в группу',
      'Студент был добавлен в группу',
      jsonb_build_object('group_id', NEW.group_id, 'status', NEW.status, 'enrollment_date', NEW.enrollment_date),
      auth.uid()
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO public.student_history (student_id, event_type, event_category, title, description, old_value, new_value, changed_by)
    VALUES (
      NEW.student_id,
      'enrollment',
      'groups',
      'Изменение статуса в группе',
      'Статус студента в группе был изменен',
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status),
      auth.uid()
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.student_history (student_id, event_type, event_category, title, description, old_value, changed_by)
    VALUES (
      OLD.student_id,
      'enrollment',
      'groups',
      'Удаление из группы',
      'Студент был удален из группы',
      jsonb_build_object('group_id', OLD.group_id, 'status', OLD.status),
      auth.uid()
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for group enrollment
CREATE TRIGGER trigger_log_group_enrollment
AFTER INSERT OR UPDATE OR DELETE ON public.group_students
FOR EACH ROW
EXECUTE FUNCTION log_group_enrollment();