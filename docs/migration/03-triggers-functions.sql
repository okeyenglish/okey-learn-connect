-- =============================================
-- AcademyOS CRM - Triggers and Functions
-- Базовые функции и триггеры для миграции
-- =============================================

-- =============================================
-- БАЗОВЫЕ ФУНКЦИИ (создавать ПЕРВЫМИ!)
-- =============================================

-- 1. update_updated_at_column - используется в 50+ таблицах
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. has_role - проверка роли пользователя (используется в RLS)
CREATE OR REPLACE FUNCTION public.has_role(check_user_id uuid, check_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = check_user_id AND ur.role = check_role
  );
$$;

-- 3. get_user_organization_id - получение организации пользователя
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$;

-- 4. auto_set_organization_id - автоматическая установка organization_id
CREATE OR REPLACE FUNCTION public.auto_set_organization_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := (SELECT organization_id FROM profiles WHERE id = auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ФУНКЦИИ ДЛЯ CLIENTS
-- =============================================

-- generate_client_number - генерация номера клиента
CREATE OR REPLACE FUNCTION public.generate_client_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num integer;
  org_prefix text;
BEGIN
  -- Получить префикс организации (первые 3 буквы)
  SELECT COALESCE(UPPER(LEFT(name, 3)), 'ORG') INTO org_prefix
  FROM organizations WHERE id = NEW.organization_id;
  
  -- Получить следующий номер для организации
  SELECT COALESCE(MAX(CAST(SUBSTRING(client_number FROM '[0-9]+$') AS integer)), 0) + 1
  INTO next_num
  FROM clients
  WHERE organization_id = NEW.organization_id;
  
  NEW.client_number := org_prefix || '-' || LPAD(next_num::text, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- trigger_normalize_client_phone - нормализация телефона
CREATE OR REPLACE FUNCTION public.trigger_normalize_client_phone()
RETURNS TRIGGER AS $$
BEGIN
  -- Удаляем всё кроме цифр и добавляем +7 если нужно
  IF NEW.phone IS NOT NULL THEN
    NEW.phone := regexp_replace(NEW.phone, '[^0-9]', '', 'g');
    IF length(NEW.phone) = 10 THEN
      NEW.phone := '7' || NEW.phone;
    ELSIF length(NEW.phone) = 11 AND left(NEW.phone, 1) = '8' THEN
      NEW.phone := '7' || right(NEW.phone, 10);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ФУНКЦИИ ДЛЯ CHAT_MESSAGES
-- =============================================

-- update_client_last_message_at
CREATE OR REPLACE FUNCTION public.update_client_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE clients 
  SET last_message_at = NEW.created_at
  WHERE id = NEW.client_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ФУНКЦИИ ДЛЯ STUDENTS
-- =============================================

-- update_student_balance - обновление баланса студента
CREATE OR REPLACE FUNCTION public.update_student_balance()
RETURNS TRIGGER AS $$
DECLARE
  new_balance numeric;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO new_balance
  FROM balance_transactions
  WHERE student_id = COALESCE(NEW.student_id, OLD.student_id);
  
  UPDATE students 
  SET balance = new_balance
  WHERE id = COALESCE(NEW.student_id, OLD.student_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ФУНКЦИИ ДЛЯ LEARNING_GROUPS
-- =============================================

-- update_group_current_students - счётчик студентов в группе
CREATE OR REPLACE FUNCTION public.update_group_current_students()
RETURNS TRIGGER AS $$
DECLARE
  group_id_to_update uuid;
BEGIN
  group_id_to_update := COALESCE(NEW.group_id, OLD.group_id);
  
  UPDATE learning_groups 
  SET current_students = (
    SELECT COUNT(*) FROM group_students 
    WHERE group_id = group_id_to_update AND is_active = true
  )
  WHERE id = group_id_to_update;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ФУНКЦИИ ДЛЯ LESSON_SESSIONS
-- =============================================

-- create_lesson_attendance - создание записей посещаемости
CREATE OR REPLACE FUNCTION public.create_lesson_attendance()
RETURNS TRIGGER AS $$
BEGIN
  -- Создать записи посещаемости для всех студентов группы
  INSERT INTO student_attendance (lesson_session_id, student_id, status)
  SELECT NEW.id, gs.student_id, 'scheduled'
  FROM group_students gs
  WHERE gs.group_id = NEW.group_id AND gs.is_active = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ФУНКЦИИ ДЛЯ MESSAGE_READ_STATUS
-- =============================================

-- mark_message_as_read
CREATE OR REPLACE FUNCTION public.mark_message_as_read(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.message_read_status (message_id, user_id)
  VALUES (p_message_id, auth.uid())
  ON CONFLICT (message_id, user_id) 
  DO UPDATE SET read_at = now();
END;
$$;

-- mark_chat_messages_as_read
CREATE OR REPLACE FUNCTION public.mark_chat_messages_as_read(p_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.message_read_status (message_id, user_id)
  SELECT cm.id, auth.uid()
  FROM public.chat_messages cm
  WHERE cm.client_id = p_client_id
    AND cm.id NOT IN (
      SELECT mrs.message_id FROM public.message_read_status mrs 
      WHERE mrs.user_id = auth.uid()
    )
  ON CONFLICT (message_id, user_id) 
  DO UPDATE SET read_at = now();
END;
$$;

-- get_message_read_status
CREATE OR REPLACE FUNCTION public.get_message_read_status(p_message_id uuid)
RETURNS TABLE(user_id uuid, user_name text, read_at timestamp with time zone)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    mrs.user_id,
    COALESCE(p.first_name || ' ' || p.last_name, p.email, 'Unknown User') as user_name,
    mrs.read_at
  FROM public.message_read_status mrs
  LEFT JOIN public.profiles p ON p.id = mrs.user_id
  WHERE mrs.message_id = p_message_id
  ORDER BY mrs.read_at ASC;
$$;

-- =============================================
-- ФУНКЦИИ ДЛЯ AUTO-GROUPS
-- =============================================

-- sync_auto_group_students
CREATE OR REPLACE FUNCTION public.sync_auto_group_students(p_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_filter jsonb;
  v_org_id uuid;
BEGIN
  -- Получить фильтр группы
  SELECT auto_filter_conditions, organization_id 
  INTO v_filter, v_org_id
  FROM learning_groups 
  WHERE id = p_group_id AND is_auto_group = true;
  
  IF v_filter IS NULL THEN
    RETURN;
  END IF;
  
  -- Удалить текущих студентов
  DELETE FROM group_students WHERE group_id = p_group_id;
  
  -- Добавить студентов по фильтру
  INSERT INTO group_students (group_id, student_id, is_active)
  SELECT p_group_id, s.id, true
  FROM students s
  JOIN clients c ON s.client_id = c.id
  WHERE c.organization_id = v_org_id
    AND s.is_studying = true
    -- Добавить условия из v_filter
  ;
  
  -- Обновить счётчик
  UPDATE learning_groups 
  SET current_students = (SELECT COUNT(*) FROM group_students WHERE group_id = p_group_id)
  WHERE id = p_group_id;
END;
$$;

-- =============================================
-- ТРИГГЕРЫ
-- =============================================

-- Триггеры для clients
DROP TRIGGER IF EXISTS set_client_number ON clients;
CREATE TRIGGER set_client_number
  BEFORE INSERT ON clients
  FOR EACH ROW
  WHEN (NEW.client_number IS NULL)
  EXECUTE FUNCTION generate_client_number();

DROP TRIGGER IF EXISTS normalize_client_phone_trigger ON clients;
CREATE TRIGGER normalize_client_phone_trigger
  BEFORE INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION trigger_normalize_client_phone();

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Триггеры для chat_messages
DROP TRIGGER IF EXISTS trigger_update_client_last_message_at ON chat_messages;
CREATE TRIGGER trigger_update_client_last_message_at
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_client_last_message_at();

DROP TRIGGER IF EXISTS set_organization_id_chat_messages ON chat_messages;
CREATE TRIGGER set_organization_id_chat_messages
  BEFORE INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_organization_id();

-- Триггеры для students
DROP TRIGGER IF EXISTS update_students_updated_at ON students;
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Триггеры для balance_transactions
DROP TRIGGER IF EXISTS update_balance_on_transaction ON balance_transactions;
CREATE TRIGGER update_balance_on_transaction
  AFTER INSERT OR UPDATE OR DELETE ON balance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_student_balance();

-- Триггеры для group_students
DROP TRIGGER IF EXISTS update_group_count ON group_students;
CREATE TRIGGER update_group_count
  AFTER INSERT OR UPDATE OR DELETE ON group_students
  FOR EACH ROW
  EXECUTE FUNCTION update_group_current_students();

-- Триггеры для learning_groups
DROP TRIGGER IF EXISTS update_learning_groups_updated_at ON learning_groups;
CREATE TRIGGER update_learning_groups_updated_at
  BEFORE UPDATE ON learning_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Триггеры для lesson_sessions
DROP TRIGGER IF EXISTS create_attendance_on_session ON lesson_sessions;
CREATE TRIGGER create_attendance_on_session
  AFTER INSERT ON lesson_sessions
  FOR EACH ROW
  EXECUTE FUNCTION create_lesson_attendance();

-- Триггеры для profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Триггеры для teachers
DROP TRIGGER IF EXISTS update_teachers_updated_at ON teachers;
CREATE TRIGGER update_teachers_updated_at
  BEFORE UPDATE ON teachers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Триггеры для payments
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ПРОВЕРКА
-- =============================================

SELECT 'Triggers and functions created successfully!' as status;

-- Список созданных функций
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- Список созданных триггеров
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
