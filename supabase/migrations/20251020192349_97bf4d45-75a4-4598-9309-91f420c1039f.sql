-- ============================================
-- Триггеры для автоматического добавления organization_id
-- ============================================

-- Функция для автоматического добавления organization_id из профиля пользователя
CREATE OR REPLACE FUNCTION public.auto_set_organization_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_org_id UUID;
BEGIN
  -- Если organization_id уже установлен, ничего не делаем
  IF NEW.organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Получаем organization_id из профиля текущего пользователя
  SELECT organization_id INTO user_org_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  -- Если найден organization_id, устанавливаем его
  IF user_org_id IS NOT NULL THEN
    NEW.organization_id := user_org_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Добавляем триггеры для всех таблиц с organization_id
CREATE TRIGGER set_organization_id_students
BEFORE INSERT ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.auto_set_organization_id();

CREATE TRIGGER set_organization_id_clients
BEFORE INSERT ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.auto_set_organization_id();

CREATE TRIGGER set_organization_id_learning_groups
BEFORE INSERT ON public.learning_groups
FOR EACH ROW
EXECUTE FUNCTION public.auto_set_organization_id();

CREATE TRIGGER set_organization_id_lesson_sessions
BEFORE INSERT ON public.lesson_sessions
FOR EACH ROW
EXECUTE FUNCTION public.auto_set_organization_id();

CREATE TRIGGER set_organization_id_individual_lessons
BEFORE INSERT ON public.individual_lessons
FOR EACH ROW
EXECUTE FUNCTION public.auto_set_organization_id();

CREATE TRIGGER set_organization_id_individual_lesson_sessions
BEFORE INSERT ON public.individual_lesson_sessions
FOR EACH ROW
EXECUTE FUNCTION public.auto_set_organization_id();

CREATE TRIGGER set_organization_id_payments
BEFORE INSERT ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.auto_set_organization_id();

CREATE TRIGGER set_organization_id_chat_messages
BEFORE INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.auto_set_organization_id();

CREATE TRIGGER set_organization_id_call_logs
BEFORE INSERT ON public.call_logs
FOR EACH ROW
EXECUTE FUNCTION public.auto_set_organization_id();

CREATE TRIGGER set_organization_id_family_groups
BEFORE INSERT ON public.family_groups
FOR EACH ROW
EXECUTE FUNCTION public.auto_set_organization_id();

CREATE TRIGGER set_organization_id_classrooms
BEFORE INSERT ON public.classrooms
FOR EACH ROW
EXECUTE FUNCTION public.auto_set_organization_id();

CREATE TRIGGER set_organization_id_student_segments
BEFORE INSERT ON public.student_segments
FOR EACH ROW
EXECUTE FUNCTION public.auto_set_organization_id();