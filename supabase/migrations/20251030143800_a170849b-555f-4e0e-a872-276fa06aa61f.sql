-- Fix actual functions with correct signatures and add SET search_path

-- 1. Fix calculate_teacher_salary (RETURNS TABLE)
CREATE OR REPLACE FUNCTION public.calculate_teacher_salary(_teacher_id uuid, _period_start date, _period_end date)
RETURNS TABLE(total_hours numeric, total_amount numeric, accrued_count integer, paid_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(academic_hours), 0) as total_hours,
    COALESCE(SUM(amount), 0) as total_amount,
    COUNT(*) FILTER (WHERE status = 'accrued')::INTEGER as accrued_count,
    COUNT(*) FILTER (WHERE status = 'paid')::INTEGER as paid_count
  FROM teacher_earnings
  WHERE teacher_id = _teacher_id
    AND earning_date >= _period_start
    AND earning_date <= _period_end
    AND status != 'cancelled';
END;
$$;

-- 2. Fix check_student_balance (RETURNS TABLE)
CREATE OR REPLACE FUNCTION public.check_student_balance(p_student_id uuid, p_required_hours numeric DEFAULT 4.0)
RETURNS TABLE(has_sufficient_balance boolean, current_balance_hours numeric, current_balance_rub numeric, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_hours NUMERIC;
  v_balance_rub NUMERIC;
BEGIN
  SELECT 
    COALESCE(SUM(academic_hours), 0) as balance_hours,
    COALESCE(SUM(amount), 0) as balance_rub
  INTO v_balance_hours, v_balance_rub
  FROM balance_transactions
  WHERE student_id = p_student_id;
  
  RETURN QUERY SELECT
    v_balance_hours >= p_required_hours,
    v_balance_hours,
    v_balance_rub,
    CASE 
      WHEN v_balance_hours >= p_required_hours THEN 
        'Баланс достаточный'
      WHEN v_balance_hours > 0 THEN 
        'Недостаточно средств. Требуется минимум ' || p_required_hours || ' часов'
      ELSE 
        'Баланс пуст. Необходимо пополнение'
    END;
END;
$$;

-- 3. Fix cleanup_old_cron_logs
CREATE OR REPLACE FUNCTION public.cleanup_old_cron_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM cron_job_logs
  WHERE executed_at < NOW() - INTERVAL '30 days';
END;
$$;

-- 4. Fix find_available_teachers (RETURNS TABLE with different columns)
CREATE OR REPLACE FUNCTION public.find_available_teachers(p_date date, p_time text, p_subject text, p_branch text)
RETURNS TABLE(teacher_id uuid, first_name text, last_name text, has_conflict boolean, conflict_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    EXISTS (
      SELECT 1 FROM learning_groups lg
      INNER JOIN lesson_sessions ls ON lg.id = ls.group_id
      WHERE lg.teacher_id = p.id
        AND ls.lesson_date = p_date
        AND lg.schedule_time = p_time
        AND ls.status != 'cancelled'
      UNION ALL
      SELECT 1 FROM individual_lessons il
      INNER JOIN individual_lesson_sessions ils ON il.id = ils.individual_lesson_id
      WHERE il.teacher_id = p.id
        AND ils.lesson_date = p_date
        AND il.schedule_time = p_time
        AND ils.status != 'cancelled'
    ) as has_conflict,
    (
      SELECT COUNT(*) FROM learning_groups lg
      INNER JOIN lesson_sessions ls ON lg.id = ls.group_id
      WHERE lg.teacher_id = p.id
        AND ls.lesson_date = p_date
        AND ls.status != 'cancelled'
      UNION ALL
      SELECT COUNT(*) FROM individual_lessons il
      INNER JOIN individual_lesson_sessions ils ON il.id = ils.individual_lesson_id
      WHERE il.teacher_id = p.id
        AND ils.lesson_date = p_date
        AND ils.status != 'cancelled'
    )::INTEGER as conflict_count
  FROM profiles p
  INNER JOIN user_roles ur ON ur.user_id = p.id
  WHERE ur.role = 'teacher'
    AND (p.branch = p_branch OR p.branch IS NULL)
  ORDER BY has_conflict, conflict_count, p.first_name;
END;
$$;

-- 5. Fix get_campaign_recipients (RETURNS TABLE)
CREATE OR REPLACE FUNCTION public.get_campaign_recipients(p_target_audience text, p_filters jsonb)
RETURNS TABLE(user_id uuid, user_name text, user_email text, user_phone text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_target_audience = 'all_students' THEN
    RETURN QUERY
    SELECT 
      p.id,
      CONCAT(p.first_name, ' ', p.last_name) as user_name,
      p.email,
      p.phone
    FROM profiles p
    INNER JOIN user_roles ur ON ur.user_id = p.id
    WHERE ur.role = 'student';
    
  ELSIF p_target_audience = 'active_students' THEN
    RETURN QUERY
    SELECT DISTINCT
      p.id,
      CONCAT(p.first_name, ' ', p.last_name) as user_name,
      p.email,
      p.phone
    FROM profiles p
    INNER JOIN user_roles ur ON ur.user_id = p.id
    WHERE ur.role = 'student'
      AND (
        EXISTS (
          SELECT 1 FROM group_students gs 
          WHERE gs.student_id = p.id AND gs.status = 'active'
        )
        OR EXISTS (
          SELECT 1 FROM individual_lessons il 
          WHERE il.student_id = p.id AND il.is_active = true
        )
      );
      
  ELSIF p_target_audience = 'low_balance' THEN
    RETURN QUERY
    SELECT 
      p.id,
      CONCAT(p.first_name, ' ', p.last_name) as user_name,
      p.email,
      p.phone
    FROM profiles p
    INNER JOIN user_roles ur ON ur.user_id = p.id
    WHERE ur.role = 'student'
      AND p.balance < 1000;
      
  ELSIF p_target_audience = 'by_branch' THEN
    RETURN QUERY
    SELECT 
      p.id,
      CONCAT(p.first_name, ' ', p.last_name) as user_name,
      p.email,
      p.phone
    FROM profiles p
    INNER JOIN user_roles ur ON ur.user_id = p.id
    WHERE ur.role = 'student'
      AND p.branch = (p_filters->>'branch');
  END IF;
END;
$$;

-- 6. Fix handle_group_lesson_charge (RETURNS TRIGGER)
CREATE OR REPLACE FUNCTION public.handle_group_lesson_charge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student RECORD;
  v_academic_hours NUMERIC;
  v_lesson_duration NUMERIC;
  v_group_name TEXT;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    SELECT name INTO v_group_name
    FROM learning_groups
    WHERE id = NEW.group_id;
    
    v_lesson_duration := EXTRACT(EPOCH FROM (NEW.end_time::time - NEW.start_time::time)) / 60;
    v_academic_hours := v_lesson_duration / 45.0;
    
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
        academic_hours,
        transaction_type,
        description,
        lesson_session_id,
        related_group_id,
        price_per_hour
      ) VALUES (
        v_student.student_id,
        0,
        -ABS(v_academic_hours),
        'lesson_charge',
        'Списание за групповое занятие: ' || COALESCE(v_group_name, 'Группа'),
        NEW.id,
        NEW.group_id,
        NULL
      );
      
      RAISE NOTICE 'Charged % academic hours for student % (%) in group lesson %', 
        v_academic_hours, v_student.student_name, v_student.student_id, NEW.id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 7. Fix handle_individual_lesson_charge (RETURNS TRIGGER)
CREATE OR REPLACE FUNCTION public.handle_individual_lesson_charge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_academic_hours NUMERIC;
  v_price_per_hour NUMERIC;
  v_amount NUMERIC;
  v_lesson_name TEXT;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    SELECT 
      il.student_id,
      il.academic_hours,
      il.price_per_lesson,
      il.duration,
      s.first_name || ' ' || s.last_name
    INTO 
      v_student_id,
      v_academic_hours,
      v_price_per_hour,
      v_lesson_name
    FROM individual_lessons il
    LEFT JOIN students s ON s.id = il.student_id
    WHERE il.id = NEW.individual_lesson_id;
    
    IF v_student_id IS NULL THEN
      RAISE WARNING 'Student not found for individual_lesson_id: %', NEW.individual_lesson_id;
      RETURN NEW;
    END IF;
    
    IF v_academic_hours IS NULL OR v_academic_hours = 0 THEN
      v_academic_hours := COALESCE(NEW.duration, 60) / 45.0;
    END IF;
    
    IF v_price_per_hour IS NOT NULL AND v_price_per_hour > 0 THEN
      v_amount := v_price_per_hour * v_academic_hours;
    ELSE
      v_amount := 0;
    END IF;
    
    INSERT INTO balance_transactions (
      student_id,
      amount,
      academic_hours,
      transaction_type,
      description,
      lesson_session_id,
      related_individual_lesson_id,
      price_per_hour
    ) VALUES (
      v_student_id,
      -ABS(v_amount),
      -ABS(v_academic_hours),
      'lesson_charge',
      'Списание за проведенное индивидуальное занятие ' || COALESCE(v_lesson_name, ''),
      NEW.id,
      NEW.individual_lesson_id,
      CASE WHEN v_academic_hours > 0 THEN v_amount / v_academic_hours ELSE NULL END
    );
    
    RAISE NOTICE 'Charged % academic hours (% RUB) for individual lesson session %', 
      v_academic_hours, v_amount, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 8. Fix track_lead_status_change (RETURNS TRIGGER)
CREATE OR REPLACE FUNCTION public.track_lead_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status_id IS DISTINCT FROM NEW.status_id THEN
    INSERT INTO lead_status_history (
      lead_id,
      from_status_id,
      to_status_id,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.status_id,
      NEW.status_id,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;