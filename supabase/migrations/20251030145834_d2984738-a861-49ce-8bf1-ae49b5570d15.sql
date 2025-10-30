-- Fix teacher earnings automatic creation
-- Update triggers to automatically create teacher_earnings when lessons are completed

-- Update trigger function for group lessons
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
  v_teacher_id UUID;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Get group information
    SELECT name, teacher_id INTO v_group_name, v_teacher_id
    FROM learning_groups
    WHERE id = NEW.group_id;
    
    v_lesson_duration := EXTRACT(EPOCH FROM (NEW.end_time::time - NEW.start_time::time)) / 60;
    v_academic_hours := v_lesson_duration / 45.0;
    
    -- Create teacher earning automatically
    IF v_teacher_id IS NOT NULL THEN
      PERFORM create_teacher_earning(
        v_teacher_id,
        NEW.id,
        NULL,
        NEW.lesson_date
      );
    END IF;
    
    -- Charge students' balance
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

-- Update trigger function for individual lessons
CREATE OR REPLACE FUNCTION public.handle_individual_lesson_charge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    
    -- Get lesson information
    SELECT 
      il.student_id,
      il.teacher_id,
      il.subject
    INTO v_student_id, v_teacher_id, v_lesson_name
    FROM individual_lessons il
    WHERE il.id = NEW.individual_lesson_id;
    
    -- Calculate academic hours
    v_academic_hours := NEW.duration / 40.0;
    
    -- Create teacher earning automatically
    IF v_teacher_id IS NOT NULL THEN
      PERFORM create_teacher_earning(
        v_teacher_id,
        NULL,
        NEW.id,
        NEW.lesson_date
      );
    END IF;
    
    -- Get price per hour
    SELECT price_per_40_min INTO v_price_per_hour
    FROM course_prices
    LIMIT 1;
    
    v_amount := v_academic_hours * COALESCE(v_price_per_hour, 1800);
    
    -- Charge student balance
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

COMMENT ON FUNCTION handle_group_lesson_charge IS 'Automatically creates teacher earnings and charges student balance when group lesson is completed';
COMMENT ON FUNCTION handle_individual_lesson_charge IS 'Automatically creates teacher earnings and charges student balance when individual lesson is completed';