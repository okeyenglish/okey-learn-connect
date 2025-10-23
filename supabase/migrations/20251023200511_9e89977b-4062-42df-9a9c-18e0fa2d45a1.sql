-- Update trigger function to avoid FK errors when deleting learning_groups
CREATE OR REPLACE FUNCTION public.log_group_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO group_history (group_id, event_type, event_data, changed_by)
    VALUES (NEW.id, 'created', to_jsonb(NEW), auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    -- Логируем только если есть изменения в ключевых полях
    IF (OLD.status != NEW.status) THEN
      INSERT INTO group_history (group_id, event_type, event_data, changed_by)
      VALUES (NEW.id, 'status_changed', 
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status),
        auth.uid());
    END IF;
    
    IF (OLD.responsible_teacher != NEW.responsible_teacher OR 
        (OLD.responsible_teacher IS NULL AND NEW.responsible_teacher IS NOT NULL) OR
        (OLD.responsible_teacher IS NOT NULL AND NEW.responsible_teacher IS NULL)) THEN
      INSERT INTO group_history (group_id, event_type, event_data, changed_by)
      VALUES (NEW.id, 'teacher_changed', 
        jsonb_build_object('old_teacher', OLD.responsible_teacher, 'new_teacher', NEW.responsible_teacher),
        auth.uid());
    END IF;
    
    IF (OLD.schedule_days IS DISTINCT FROM NEW.schedule_days OR 
        OLD.schedule_time IS DISTINCT FROM NEW.schedule_time) THEN
      INSERT INTO group_history (group_id, event_type, event_data, changed_by)
      VALUES (NEW.id, 'schedule_changed', 
        jsonb_build_object(
          'old_schedule_days', OLD.schedule_days, 
          'new_schedule_days', NEW.schedule_days,
          'old_schedule_time', OLD.schedule_time,
          'new_schedule_time', NEW.schedule_time
        ),
        auth.uid());
    END IF;
    
    -- Общее логирование обновления
    INSERT INTO group_history (group_id, event_type, event_data, changed_by)
    VALUES (NEW.id, 'updated', 
      jsonb_build_object('changes', jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))),
      auth.uid());
  ELSIF TG_OP = 'DELETE' THEN
    -- ВАЖНО: не логируем удаление группы, чтобы избежать нарушения FK при массовом удалении
    -- Историю удаления можно хранить отдельно при необходимости
    RETURN OLD;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;