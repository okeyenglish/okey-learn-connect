-- Исправляем функцию accrue_teacher_earning_for_lesson (lesson_date -> earning_date)
CREATE OR REPLACE FUNCTION public.accrue_teacher_earning_for_lesson(
  _lesson_session_id uuid DEFAULT NULL::uuid,
  _individual_lesson_session_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_teacher_id UUID;
  v_lesson_date DATE;
  v_duration NUMERIC;
  v_branch TEXT;
  v_subject TEXT;
  v_rate NUMERIC;
  v_amount NUMERIC;
  v_earning_id UUID;
  v_organization_id UUID;
BEGIN
  -- Определяем тип урока и собираем данные
  IF _lesson_session_id IS NOT NULL THEN
    -- Групповое занятие
    SELECT 
      lg.teacher_id,
      ls.lesson_date,
      EXTRACT(EPOCH FROM (ls.end_time - ls.start_time)) / 60 / 45 AS academic_hours,
      ls.branch,
      ls.organization_id
    INTO 
      v_teacher_id,
      v_lesson_date,
      v_duration,
      v_branch,
      v_organization_id
    FROM lesson_sessions ls
    JOIN learning_groups lg ON lg.id = ls.group_id
    WHERE ls.id = _lesson_session_id;
    
  ELSIF _individual_lesson_session_id IS NOT NULL THEN
    -- Индивидуальное занятие
    SELECT 
      il.teacher_id,
      ils.lesson_date,
      ils.duration / 40.0 AS academic_hours,
      ils.branch,
      il.subject,
      ils.organization_id
    INTO 
      v_teacher_id,
      v_lesson_date,
      v_duration,
      v_branch,
      v_subject,
      v_organization_id
    FROM individual_lesson_sessions ils
    JOIN individual_lessons il ON il.id = ils.individual_lesson_id
    WHERE ils.id = _individual_lesson_session_id;
  ELSE
    RAISE EXCEPTION 'Необходимо указать ID занятия';
  END IF;
  
  IF v_teacher_id IS NULL THEN
    RAISE WARNING 'Преподаватель не найден для занятия';
    RETURN NULL;
  END IF;
  
  -- Проверяем, не создано ли уже начисление для этого занятия
  IF _lesson_session_id IS NOT NULL THEN
    SELECT id INTO v_earning_id
    FROM teacher_earnings
    WHERE lesson_session_id = _lesson_session_id;
    
    IF v_earning_id IS NOT NULL THEN
      RAISE WARNING 'Начисление для группового занятия % уже существует', _lesson_session_id;
      RETURN v_earning_id;
    END IF;
  END IF;
  
  IF _individual_lesson_session_id IS NOT NULL THEN
    SELECT id INTO v_earning_id
    FROM teacher_earnings
    WHERE individual_lesson_session_id = _individual_lesson_session_id;
    
    IF v_earning_id IS NOT NULL THEN
      RAISE WARNING 'Начисление для индивидуального занятия % уже существует', _individual_lesson_session_id;
      RETURN v_earning_id;
    END IF;
  END IF;
  
  -- Получаем ставку преподавателя
  v_rate := get_teacher_rate(v_teacher_id, v_branch, v_subject, v_lesson_date);
  
  IF v_rate IS NULL OR v_rate = 0 THEN
    RAISE WARNING 'Ставка преподавателя не найдена. Используется 0';
    v_rate := 0;
  END IF;
  
  -- Вычисляем сумму
  v_amount := v_rate * v_duration;
  
  -- Создаем запись о начислении (ИСПРАВЛЕНО: lesson_date -> earning_date)
  INSERT INTO teacher_earnings (
    teacher_id,
    lesson_session_id,
    individual_lesson_session_id,
    earning_date,
    academic_hours,
    rate_per_hour,
    amount,
    status,
    currency
  ) VALUES (
    v_teacher_id,
    _lesson_session_id,
    _individual_lesson_session_id,
    v_lesson_date,
    v_duration,
    v_rate,
    v_amount,
    'accrued',
    'RUB'
  )
  RETURNING id INTO v_earning_id;
  
  RETURN v_earning_id;
END;
$$;

-- Исправляем функцию для групповых занятий (вызов правильной функции)
CREATE OR REPLACE FUNCTION public.handle_group_lesson_charge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_student RECORD;
  v_academic_hours NUMERIC;
  v_lesson_duration NUMERIC;
  v_group_name TEXT;
  v_teacher_id UUID;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Получаем информацию о группе
    SELECT name, teacher_id INTO v_group_name, v_teacher_id
    FROM learning_groups
    WHERE id = NEW.group_id;
    
    v_lesson_duration := EXTRACT(EPOCH FROM (NEW.end_time::time - NEW.start_time::time)) / 60;
    v_academic_hours := v_lesson_duration / 45.0;
    
    -- Создаем начисление преподавателю (ИСПРАВЛЕНО: вызов правильной функции)
    IF v_teacher_id IS NOT NULL THEN
      BEGIN
        PERFORM accrue_teacher_earning_for_lesson(
          _lesson_session_id := NEW.id,
          _individual_lesson_session_id := NULL
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Не удалось создать начисление преподавателю для занятия %: %', NEW.id, SQLERRM;
      END;
    END IF;
    
    -- Списываем баланс студентов
    FOR v_student IN 
      SELECT 
        gs.student_id,
        s.first_name || ' ' || s.last_name as student_name
      FROM group_students gs
      JOIN students s ON s.id = gs.student_id
      WHERE gs.group_id = NEW.group_id
        AND gs.status = 'active'
    LOOP
      INSERT INTO balance_transactions (
        student_id,
        amount,
        transaction_type,
        description,
        lesson_session_id
      ) VALUES (
        v_student.student_id,
        -(v_academic_hours * 1800 / 40),
        'debit',
        'Списание за групповое занятие: ' || COALESCE(v_group_name, 'Группа'),
        NEW.id
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Исправляем функцию для индивидуальных занятий (вызов правильной функции)
CREATE OR REPLACE FUNCTION public.handle_individual_lesson_charge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_student_id UUID;
  v_teacher_id UUID;
  v_academic_hours NUMERIC;
  v_price_per_hour NUMERIC;
  v_amount NUMERIC;
  v_lesson_name TEXT;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Получаем информацию об уроке
    SELECT 
      il.student_id,
      il.teacher_id,
      il.subject
    INTO v_student_id, v_teacher_id, v_lesson_name
    FROM individual_lessons il
    WHERE il.id = NEW.individual_lesson_id;
    
    -- Рассчитываем академические часы
    v_academic_hours := NEW.duration / 40.0;
    
    -- Создаем начисление преподавателю (ИСПРАВЛЕНО: вызов правильной функции)
    IF v_teacher_id IS NOT NULL THEN
      BEGIN
        PERFORM accrue_teacher_earning_for_lesson(
          _lesson_session_id := NULL,
          _individual_lesson_session_id := NEW.id
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Не удалось создать начисление преподавателю для занятия %: %', NEW.id, SQLERRM;
      END;
    END IF;
    
    -- Получаем цену за час
    SELECT price_per_40_min INTO v_price_per_hour
    FROM course_prices
    LIMIT 1;
    
    v_amount := v_academic_hours * COALESCE(v_price_per_hour, 1800);
    
    -- Списываем баланс студента
    INSERT INTO balance_transactions (
      student_id,
      amount,
      transaction_type,
      description,
      lesson_session_id
    ) VALUES (
      v_student_id,
      -v_amount,
      'debit',
      'Списание за индивидуальное занятие: ' || COALESCE(v_lesson_name, 'Урок'),
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION accrue_teacher_earning_for_lesson IS 'Создает начисление преподавателю за проведенное занятие (групповое или индивидуальное)';
COMMENT ON FUNCTION handle_group_lesson_charge IS 'Автоматически создает начисления преподавателю и списывает баланс студентов при завершении группового занятия';
COMMENT ON FUNCTION handle_individual_lesson_charge IS 'Автоматически создает начисления преподавателю и списывает баланс студента при завершении индивидуального занятия';