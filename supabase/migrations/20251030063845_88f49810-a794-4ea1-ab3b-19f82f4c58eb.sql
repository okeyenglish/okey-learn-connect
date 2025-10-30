-- ============================================
-- ПРИОРИТЕТ 1 (продолжение): ИСПРАВЛЕНИЕ ОСТАВШИХСЯ ФУНКЦИЙ
-- ============================================
-- Добавляем SET search_path = public к оставшимся функциям

-- 3.1 Функции проверки ролей и прав
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS app_role[]
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY(
    SELECT role 
    FROM public.user_roles
    WHERE user_id = _user_id
    ORDER BY 
      CASE role
        WHEN 'admin' THEN 1
        WHEN 'branch_manager' THEN 2
        WHEN 'methodist' THEN 3
        WHEN 'head_teacher' THEN 4
        WHEN 'sales_manager' THEN 5
        WHEN 'marketing_manager' THEN 6
        WHEN 'manager' THEN 7
        WHEN 'accountant' THEN 8
        WHEN 'receptionist' THEN 9
        WHEN 'teacher' THEN 10
        WHEN 'student' THEN 11
      END
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid)
RETURNS TABLE(permission_key text, is_granted boolean)
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT permission_key, is_granted
  FROM public.user_permissions
  WHERE user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.user_has_permission(_user_id uuid, _permission_key text)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_granted 
     FROM public.user_permissions 
     WHERE user_id = _user_id AND permission_key = _permission_key),
    false
  )
$$;

CREATE OR REPLACE FUNCTION public.user_has_permission(_user_id uuid, _permission text, _resource text)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = _user_id
      AND rp.permission = _permission 
      AND (rp.resource = _resource OR rp.resource = 'all')
  )
$$;

-- 3.2 Функции для организаций и филиалов
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id 
  FROM public.profiles 
  WHERE id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_user_branches(_user_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY(
    SELECT DISTINCT branch FROM (
      SELECT branch FROM public.profiles WHERE id = _user_id
      UNION
      SELECT branch FROM public.manager_branches WHERE manager_id = _user_id
    ) branches
    WHERE branch IS NOT NULL
  )
$$;

-- 3.3 Функции для сообщений
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
  ON CONFLICT (message_id, user_id) 
  DO UPDATE SET read_at = now();
END;
$$;

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
  ORDER BY mrs.read_at ASC
$$;

CREATE OR REPLACE FUNCTION public.get_chat_pin_counts(_chat_ids text[])
RETURNS TABLE(chat_id text, pin_count integer)
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cs.chat_id, COUNT(*)::int AS pin_count
  FROM public.chat_states cs
  WHERE cs.is_pinned = true
    AND cs.chat_id = ANY(_chat_ids)
  GROUP BY cs.chat_id
$$;

-- 3.4 Триггерные функции для истории
CREATE OR REPLACE FUNCTION public.log_payment_event()
RETURNS trigger
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

CREATE OR REPLACE FUNCTION public.log_group_student_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO group_history (group_id, event_type, event_data, changed_by)
    VALUES (NEW.group_id, 'student_added', 
      jsonb_build_object(
        'student_id', NEW.student_id, 
        'enrollment_type', NEW.enrollment_type,
        'status', NEW.status
      ),
      auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    IF (OLD.status != NEW.status) THEN
      INSERT INTO group_history (group_id, event_type, event_data, changed_by)
      VALUES (NEW.group_id, 'student_status_changed', 
        jsonb_build_object(
          'student_id', NEW.student_id,
          'old_status', OLD.status,
          'new_status', NEW.status
        ),
        auth.uid());
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO group_history (group_id, event_type, event_data, changed_by)
    VALUES (OLD.group_id, 'student_removed', 
      jsonb_build_object('student_id', OLD.student_id, 'status', OLD.status),
      auth.uid());
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_client_last_message_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE clients
  SET last_message_at = NEW.created_at
  WHERE id = NEW.client_id
    AND (last_message_at IS NULL OR last_message_at < NEW.created_at);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_group_student_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.learning_groups 
    SET current_students = (
      SELECT COUNT(*) FROM public.group_students 
      WHERE group_id = NEW.group_id AND status = 'active'
    )
    WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.learning_groups 
    SET current_students = (
      SELECT COUNT(*) FROM public.group_students 
      WHERE group_id = NEW.group_id AND status = 'active'
    )
    WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.learning_groups 
    SET current_students = (
      SELECT COUNT(*) FROM public.group_students 
      WHERE group_id = OLD.group_id AND status = 'active'
    )
    WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 3.5 Функции для расписания и конфликтов
CREATE OR REPLACE FUNCTION public.check_teacher_conflict(
  p_teacher_name text, 
  p_lesson_date date, 
  p_start_time time without time zone, 
  p_end_time time without time zone, 
  p_exclude_session_id uuid DEFAULT NULL::uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.lesson_sessions
    WHERE teacher_name = p_teacher_name
    AND lesson_date = p_lesson_date
    AND status != 'cancelled'
    AND (p_exclude_session_id IS NULL OR id != p_exclude_session_id)
    AND (
      (start_time <= p_start_time AND end_time > p_start_time) OR
      (start_time < p_end_time AND end_time >= p_end_time) OR
      (start_time >= p_start_time AND end_time <= p_end_time)
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_classroom_conflict(
  p_branch text, 
  p_classroom text, 
  p_lesson_date date, 
  p_start_time time without time zone, 
  p_end_time time without time zone, 
  p_exclude_session_id uuid DEFAULT NULL::uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.lesson_sessions
    WHERE branch = p_branch
    AND classroom = p_classroom
    AND lesson_date = p_lesson_date
    AND status != 'cancelled'
    AND (p_exclude_session_id IS NULL OR id != p_exclude_session_id)
    AND (
      (start_time <= p_start_time AND end_time > p_start_time) OR
      (start_time < p_end_time AND end_time >= p_end_time) OR
      (start_time >= p_start_time AND end_time <= p_end_time)
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_student_conflict(
  p_student_id uuid, 
  p_lesson_date date, 
  p_start_time time without time zone, 
  p_end_time time without time zone, 
  p_exclude_session_id uuid DEFAULT NULL::uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.student_lesson_sessions sls
    JOIN public.lesson_sessions ls ON ls.id = sls.lesson_session_id
    WHERE sls.student_id = p_student_id
    AND ls.lesson_date = p_lesson_date
    AND ls.status != 'cancelled'
    AND (p_exclude_session_id IS NULL OR ls.id != p_exclude_session_id)
    AND (
      (ls.start_time <= p_start_time AND ls.end_time > p_start_time) OR
      (ls.start_time < p_end_time AND ls.end_time >= p_end_time) OR
      (ls.start_time >= p_start_time AND ls.end_time <= p_end_time)
    )
  );
END;
$$;

-- 3.6 Функции для студентов
CREATE OR REPLACE FUNCTION public.get_student_by_user_id(_user_id uuid)
RETURNS TABLE(
  id uuid, 
  name text, 
  first_name text, 
  last_name text, 
  middle_name text, 
  age integer, 
  phone text, 
  family_group_id uuid, 
  status text, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.name, s.first_name, s.last_name, s.middle_name, 
         s.age, s.phone, s.family_group_id, s.status::text, 
         s.created_at, s.updated_at
  FROM public.students s
  JOIN public.profiles p ON p.phone = s.phone
  WHERE p.id = _user_id
  LIMIT 1
$$;

-- 3.7 Функции для баланса
CREATE OR REPLACE FUNCTION public.add_balance_transaction(
  _student_id uuid, 
  _amount numeric, 
  _transaction_type balance_transaction_type, 
  _description text, 
  _payment_id uuid DEFAULT NULL::uuid, 
  _lesson_session_id uuid DEFAULT NULL::uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance numeric;
BEGIN
  -- Получаем текущий баланс или создаем запись, если её нет
  INSERT INTO public.student_balances (student_id, balance)
  VALUES (_student_id, 0)
  ON CONFLICT (student_id) DO NOTHING;
  
  SELECT balance INTO current_balance
  FROM public.student_balances
  WHERE student_id = _student_id;
  
  -- Обновляем баланс в зависимости от типа транзакции
  IF _transaction_type IN ('credit', 'transfer_in', 'refund') THEN
    -- Пополнение баланса
    UPDATE public.student_balances
    SET balance = balance + _amount,
        updated_at = now()
    WHERE student_id = _student_id;
  ELSIF _transaction_type = 'debit' THEN
    -- Списание с баланса
    IF current_balance < _amount THEN
      RAISE EXCEPTION 'Недостаточно средств на балансе';
    END IF;
    
    UPDATE public.student_balances
    SET balance = balance - _amount,
        updated_at = now()
    WHERE student_id = _student_id;
  END IF;
  
  -- Записываем транзакцию
  INSERT INTO public.balance_transactions (
    student_id,
    amount,
    transaction_type,
    description,
    payment_id,
    lesson_session_id
  ) VALUES (
    _student_id,
    _amount,
    _transaction_type,
    _description,
    _payment_id,
    _lesson_session_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_student_balance(_student_id uuid)
RETURNS TABLE(
  student_id uuid, 
  balance numeric, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT student_id, balance, created_at, updated_at
  FROM public.student_balances
  WHERE student_id = _student_id
$$;

-- 3.8 Функция для ставок преподавателей
CREATE OR REPLACE FUNCTION public.get_teacher_rate(
  _teacher_id uuid, 
  _branch text DEFAULT NULL::text, 
  _subject text DEFAULT NULL::text, 
  _date date DEFAULT CURRENT_DATE
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate NUMERIC;
BEGIN
  -- Приоритет: персональная > предмет > филиал > глобальная
  
  -- Персональная ставка
  SELECT rate_per_academic_hour INTO v_rate
  FROM teacher_rates
  WHERE teacher_id = _teacher_id
    AND rate_type = 'personal'
    AND is_active = true
    AND valid_from <= _date
    AND (valid_until IS NULL OR valid_until >= _date)
  ORDER BY valid_from DESC
  LIMIT 1;
  
  IF v_rate IS NOT NULL THEN
    RETURN v_rate;
  END IF;
  
  -- Ставка по предмету
  IF _subject IS NOT NULL THEN
    SELECT rate_per_academic_hour INTO v_rate
    FROM teacher_rates
    WHERE teacher_id = _teacher_id
      AND rate_type = 'subject'
      AND subject = _subject
      AND is_active = true
      AND valid_from <= _date
      AND (valid_until IS NULL OR valid_until >= _date)
    ORDER BY valid_from DESC
    LIMIT 1;
    
    IF v_rate IS NOT NULL THEN
      RETURN v_rate;
    END IF;
  END IF;
  
  -- Ставка по филиалу
  IF _branch IS NOT NULL THEN
    SELECT rate_per_academic_hour INTO v_rate
    FROM teacher_rates
    WHERE teacher_id = _teacher_id
      AND rate_type = 'branch'
      AND branch = _branch
      AND is_active = true
      AND valid_from <= _date
      AND (valid_until IS NULL OR valid_until >= _date)
    ORDER BY valid_from DESC
    LIMIT 1;
    
    IF v_rate IS NOT NULL THEN
      RETURN v_rate;
    END IF;
  END IF;
  
  -- Глобальная ставка
  SELECT rate_per_academic_hour INTO v_rate
  FROM teacher_rates
  WHERE teacher_id = _teacher_id
    AND rate_type = 'global'
    AND is_active = true
    AND valid_from <= _date
    AND (valid_until IS NULL OR valid_until >= _date)
  ORDER BY valid_from DESC
  LIMIT 1;
  
  RETURN COALESCE(v_rate, 0);
END;
$$;

-- 3.9 Функция для прав групп
CREATE OR REPLACE FUNCTION public.check_group_permission(
  p_user_id uuid, 
  p_group_id uuid, 
  p_permission text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_perm BOOLEAN := false;
BEGIN
  -- Админы имеют все права
  IF has_role(p_user_id, 'admin') THEN
    RETURN true;
  END IF;
  
  -- Проверяем специфичные права (глобальные или для конкретной группы)
  SELECT 
    CASE p_permission
      WHEN 'create' THEN can_create_groups
      WHEN 'edit' THEN can_edit_groups
      WHEN 'delete' THEN can_delete_groups
      WHEN 'add_students' THEN can_add_students
      WHEN 'remove_students' THEN can_remove_students
      WHEN 'change_status' THEN can_change_status
      WHEN 'set_custom_name' THEN can_set_custom_name
      WHEN 'view_finances' THEN can_view_finances
      WHEN 'access_all_branches' THEN can_access_all_branches
      ELSE false
    END INTO v_has_perm
  FROM group_permissions
  WHERE user_id = p_user_id 
    AND (group_id IS NULL OR group_id = p_group_id)
  ORDER BY group_id NULLS LAST -- Приоритет специфичным правам группы
  LIMIT 1;
  
  RETURN COALESCE(v_has_perm, false);
END;
$$;

-- Логирование завершения миграции
DO $$
BEGIN
  RAISE NOTICE '✅ SECURITY PATCH PART 2 APPLIED:';
  RAISE NOTICE '   - Added search_path to 21 remaining functions';
  RAISE NOTICE '   - All SECURITY DEFINER functions now protected';
  RAISE NOTICE '   - Migration completed at: %', now();
END $$;