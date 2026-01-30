-- Миграция: Добавление уникальности телефонов для предотвращения дубликатов
-- Выполните на self-hosted Supabase (api.academyos.ru)

-- 1. Функция нормализации телефона (последние 10 цифр)
CREATE OR REPLACE FUNCTION public.normalize_phone(phone_input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT RIGHT(REGEXP_REPLACE(COALESCE(phone_input, ''), '[^0-9]', '', 'g'), 10);
$$;

-- 2. Функция проверки дублирования преподавателя при INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.check_teacher_phone_duplicate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized_phone TEXT;
  v_existing_id UUID;
BEGIN
  -- Нормализуем телефон
  v_normalized_phone := normalize_phone(NEW.phone);
  
  -- Если телефон пустой или короткий, пропускаем
  IF v_normalized_phone IS NULL OR LENGTH(v_normalized_phone) < 10 THEN
    RETURN NEW;
  END IF;
  
  -- Ищем существующего преподавателя с таким же телефоном
  SELECT id INTO v_existing_id
  FROM teachers
  WHERE id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND normalize_phone(phone) = v_normalized_phone
    AND COALESCE(is_active, true) = true
  LIMIT 1;
  
  IF v_existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'Преподаватель с таким телефоном уже существует (ID: %)', v_existing_id
      USING ERRCODE = 'unique_violation';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Создаём триггер
DROP TRIGGER IF EXISTS check_teacher_phone_duplicate_trigger ON teachers;
CREATE TRIGGER check_teacher_phone_duplicate_trigger
  BEFORE INSERT OR UPDATE ON teachers
  FOR EACH ROW
  EXECUTE FUNCTION check_teacher_phone_duplicate();

-- 4. Аналогичная функция для клиентов
CREATE OR REPLACE FUNCTION public.check_client_phone_duplicate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized_phone TEXT;
  v_existing_id UUID;
BEGIN
  -- Нормализуем телефон
  v_normalized_phone := normalize_phone(NEW.phone);
  
  -- Если телефон пустой или короткий, пропускаем
  IF v_normalized_phone IS NULL OR LENGTH(v_normalized_phone) < 10 THEN
    RETURN NEW;
  END IF;
  
  -- Ищем существующего клиента с таким же телефоном
  SELECT id INTO v_existing_id
  FROM clients
  WHERE id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND normalize_phone(phone) = v_normalized_phone
    AND COALESCE(is_active, true) = true
  LIMIT 1;
  
  IF v_existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'Клиент с таким телефоном уже существует (ID: %)', v_existing_id
      USING ERRCODE = 'unique_violation';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Создаём триггер для клиентов
DROP TRIGGER IF EXISTS check_client_phone_duplicate_trigger ON clients;
CREATE TRIGGER check_client_phone_duplicate_trigger
  BEFORE INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION check_client_phone_duplicate();

-- 6. Функция для поиска и объединения существующих дубликатов преподавателей (без organization_id)
CREATE OR REPLACE FUNCTION public.find_duplicate_teachers()
RETURNS TABLE(
  normalized_phone TEXT,
  teacher_ids UUID[],
  teacher_names TEXT[],
  duplicate_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    normalize_phone(phone) as normalized_phone,
    ARRAY_AGG(id ORDER BY created_at) as teacher_ids,
    ARRAY_AGG(COALESCE(last_name || ' ' || first_name, first_name) ORDER BY created_at) as teacher_names,
    COUNT(*) as duplicate_count
  FROM teachers
  WHERE COALESCE(is_active, true) = true
    AND phone IS NOT NULL
    AND LENGTH(normalize_phone(phone)) >= 10
  GROUP BY normalize_phone(phone)
  HAVING COUNT(*) > 1
  ORDER BY duplicate_count DESC;
$$;

-- 7. Функция для поиска дубликатов клиентов (без organization_id)
CREATE OR REPLACE FUNCTION public.find_duplicate_clients()
RETURNS TABLE(
  normalized_phone TEXT,
  client_ids UUID[],
  client_names TEXT[],
  duplicate_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    normalize_phone(phone) as normalized_phone,
    ARRAY_AGG(id ORDER BY created_at) as client_ids,
    ARRAY_AGG(COALESCE(name, first_name || ' ' || COALESCE(last_name, '')) ORDER BY created_at) as client_names,
    COUNT(*) as duplicate_count
  FROM clients
  WHERE COALESCE(is_active, true) = true
    AND phone IS NOT NULL
    AND LENGTH(normalize_phone(phone)) >= 10
  GROUP BY normalize_phone(phone)
  HAVING COUNT(*) > 1
  ORDER BY duplicate_count DESC;
$$;

-- Права доступа
GRANT EXECUTE ON FUNCTION public.normalize_phone(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_duplicate_teachers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_duplicate_clients() TO authenticated;
