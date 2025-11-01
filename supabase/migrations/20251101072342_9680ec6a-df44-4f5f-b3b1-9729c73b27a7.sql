-- Исправляем функцию validate_lesson_status_transition
-- Проблема: OLD.status это enum, но используется оператор -> который ожидает text
-- Также добавляем недостающие статусы

CREATE OR REPLACE FUNCTION validate_lesson_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  valid_transitions JSONB := '{
    "scheduled": ["in_progress", "cancelled", "rescheduled", "free", "paid_skip", "free_skip"],
    "in_progress": ["completed", "cancelled"],
    "completed": [],
    "cancelled": ["rescheduled"],
    "rescheduled": ["scheduled", "cancelled"],
    "free": ["completed", "cancelled"],
    "paid_skip": ["scheduled", "cancelled"],
    "free_skip": ["scheduled", "cancelled"]
  }'::jsonb;
BEGIN
  -- Пропускаем валидацию при INSERT
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- Проверяем легальность перехода
  IF OLD.status != NEW.status THEN
    -- ИСПРАВЛЕНИЕ: кастим enum к text для работы с jsonb оператором
    IF NOT (valid_transitions->OLD.status::text ? NEW.status::text) THEN
      RAISE EXCEPTION 'Недопустимый переход статуса: % -> %', OLD.status, NEW.status;
    END IF;
    
    -- Логируем в audit_log
    INSERT INTO public.audit_log (
      organization_id, event_type, aggregate_type, aggregate_id,
      old_value, new_value, changed_by
    ) VALUES (
      NEW.organization_id,
      'lesson.status_changed',
      'lesson_session',
      NEW.id,
      jsonb_build_object('status', OLD.status::text),
      jsonb_build_object('status', NEW.status::text),
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;