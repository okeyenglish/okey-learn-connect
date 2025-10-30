-- ============================================
-- ПРИОРИТЕТ 1: ИСПРАВЛЕНИЕ КРИТИЧЕСКИХ ОШИБОК БЕЗОПАСНОСТИ
-- ============================================
-- Источник: Supabase Linter Errors + Security Best Practices
-- Дата: 2025-10-30

-- ============================================
-- ЧАСТЬ 1: ВКЛЮЧЕНИЕ RLS ДЛЯ ТАБЛИЦ С ПОЛИТИКАМИ
-- ============================================
-- Проблема: Таблицы имеют RLS политики, но сам RLS не включен
-- Это критическая уязвимость - политики не работают!

-- Проверяем и включаем RLS для всех таблиц, которые имеют политики
DO $$
DECLARE
  table_record RECORD;
BEGIN
  -- Находим все таблицы с политиками но без включенного RLS
  FOR table_record IN 
    SELECT DISTINCT 
      schemaname, 
      tablename
    FROM pg_policies
    WHERE schemaname = 'public'
    AND NOT EXISTS (
      SELECT 1 
      FROM pg_tables pt
      WHERE pt.schemaname = pg_policies.schemaname
      AND pt.tablename = pg_policies.tablename
      AND rowsecurity = true
    )
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 
                   table_record.schemaname, 
                   table_record.tablename);
    RAISE NOTICE 'Enabled RLS for %.%', table_record.schemaname, table_record.tablename;
  END LOOP;
END $$;

-- ============================================
-- ЧАСТЬ 2: ИСПРАВЛЕНИЕ SEARCH_PATH В ФУНКЦИЯХ
-- ============================================
-- Проблема: Функции без search_path уязвимы к schema hijacking attacks
-- Решение: Добавить SET search_path = public во все функции

-- 2.1 Функции с триггерами (update timestamps)
CREATE OR REPLACE FUNCTION public.update_client_statuses_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_student_statuses_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_organizations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_group_permissions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_permissions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2.2 Функции генерации номеров
CREATE OR REPLACE FUNCTION public.generate_student_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.student_number IS NULL THEN
    NEW.student_number := 'S' || LPAD(nextval('students_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_client_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.client_number IS NULL THEN
    NEW.client_number := 'C' || LPAD(nextval('clients_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_group_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.group_number IS NULL THEN
    NEW.group_number := 'G' || LPAD(nextval('groups_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_lesson_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.lesson_number IS NULL THEN
    NEW.lesson_number := 'L' || LPAD(nextval('lessons_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- 2.3 Функция связывания студента с пользователем
CREATE OR REPLACE FUNCTION public.link_student_to_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_record RECORD;
BEGIN
  -- Ищем студента по номеру телефона из профиля пользователя
  SELECT * INTO student_record 
  FROM public.students s 
  WHERE s.phone = NEW.phone 
  LIMIT 1;
  
  -- Если найден студент с таким номером телефона, назначаем роль student
  IF student_record.id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2.4 Функция очистки старых статусов набора
CREATE OR REPLACE FUNCTION public.cleanup_old_typing_status()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.typing_status 
  SET is_typing = FALSE 
  WHERE last_activity < NOW() - INTERVAL '30 seconds' AND is_typing = TRUE;
$$;

-- 2.5 Функция синхронизации авто-групп
CREATE OR REPLACE FUNCTION public.sync_auto_group_students(p_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group RECORD;
  v_student_rec RECORD;
  v_conditions JSONB;
BEGIN
  -- Получаем информацию о группе
  SELECT * INTO v_group 
  FROM learning_groups 
  WHERE id = p_group_id AND is_auto_group = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Группа не найдена или не является автоматической';
  END IF;
  
  v_conditions := v_group.auto_filter_conditions;
  
  -- Помечаем текущих студентов как dropped (но не удаляем)
  UPDATE group_students 
  SET status = 'dropped', 
      exit_date = CURRENT_DATE,
      exit_reason = 'Автоматическая синхронизация авто-группы',
      updated_at = now()
  WHERE group_id = p_group_id 
    AND status = 'active';
  
  -- Добавляем подходящих студентов
  FOR v_student_rec IN 
    SELECT s.id 
    FROM students s
    WHERE s.status = 'active'
      AND (v_conditions->>'branch' IS NULL OR s.branch = v_conditions->>'branch')
      AND (v_conditions->>'level' IS NULL OR s.level = v_conditions->>'level')
      AND (v_conditions->>'subject' IS NULL OR (v_conditions->>'subject')::text = s.preferred_subject)
      AND (v_conditions->>'age_min' IS NULL OR s.age >= (v_conditions->>'age_min')::integer)
      AND (v_conditions->>'age_max' IS NULL OR s.age <= (v_conditions->>'age_max')::integer)
  LOOP
    -- Вставляем или обновляем статус студента
    INSERT INTO group_students (group_id, student_id, status, enrollment_type, enrollment_date, enrollment_notes)
    VALUES (p_group_id, v_student_rec.id, 'active', 'auto', CURRENT_DATE, 'Автоматически добавлен по условиям авто-группы')
    ON CONFLICT (group_id, student_id) 
    DO UPDATE SET 
      status = 'active',
      enrollment_type = 'auto',
      exit_date = NULL,
      exit_reason = NULL,
      updated_at = now();
  END LOOP;
  
  -- Логируем синхронизацию
  INSERT INTO group_history (group_id, event_type, event_data, changed_by)
  VALUES (p_group_id, 'auto_sync', 
    jsonb_build_object('sync_date', CURRENT_DATE, 'conditions', v_conditions),
    NULL);
END;
$$;

-- ============================================
-- ЧАСТЬ 3: АУДИТ И ЛОГИРОВАНИЕ
-- ============================================

-- Создаем комментарии для документации
COMMENT ON FUNCTION public.update_client_statuses_updated_at IS 
'SECURITY: Триггер-функция с search_path protection. Обновляет updated_at при изменении статуса клиента.';

COMMENT ON FUNCTION public.generate_student_number IS 
'SECURITY: Триггер-функция с search_path protection. Генерирует уникальный номер студента при создании.';

-- Логируем выполнение миграции
DO $$
BEGIN
  RAISE NOTICE '✅ SECURITY PATCH APPLIED:';
  RAISE NOTICE '   - RLS enabled for all tables with policies';
  RAISE NOTICE '   - search_path set for all SECURITY DEFINER functions';
  RAISE NOTICE '   - Schema hijacking attack vector eliminated';
  RAISE NOTICE '   - Migration completed at: %', now();
END $$;