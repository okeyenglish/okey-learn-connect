
-- Drop the function with CASCADE to remove dependent triggers
DROP FUNCTION IF EXISTS public.log_payment_event() CASCADE;

-- Create corrected function with proper field names
CREATE OR REPLACE FUNCTION public.log_payment_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_record RECORD;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get student info for individual lessons
    IF NEW.individual_lesson_id IS NOT NULL THEN
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
          'Добавлена новая оплата на сумму ' || NEW.amount || ' руб.',
          jsonb_build_object('payment_id', NEW.id, 'amount', NEW.amount, 'method', NEW.method, 'lessons_count', NEW.lessons_count),
          auth.uid()
        );
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Get student info for individual lessons
    IF OLD.individual_lesson_id IS NOT NULL THEN
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
          'Оплата на сумму ' || OLD.amount || ' руб. была удалена',
          jsonb_build_object('payment_id', OLD.id, 'amount', OLD.amount, 'method', OLD.method, 'lessons_count', OLD.lessons_count),
          auth.uid()
        );
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recreate trigger
CREATE TRIGGER trigger_log_payment_events
AFTER INSERT OR DELETE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.log_payment_event();
