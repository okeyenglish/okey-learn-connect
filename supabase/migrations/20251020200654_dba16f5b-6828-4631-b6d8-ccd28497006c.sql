-- Функция для автоматического списания баланса при проведении индивидуального занятия
CREATE OR REPLACE FUNCTION handle_individual_lesson_charge()
RETURNS TRIGGER AS $$
DECLARE
  v_student_id UUID;
  v_academic_hours NUMERIC;
  v_price_per_hour NUMERIC;
  v_amount NUMERIC;
  v_lesson_name TEXT;
BEGIN
  -- Списываем только при переходе в статус 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Получаем информацию о занятии и студенте
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
    
    -- Если не нашли студента или данные некорректны, выходим
    IF v_student_id IS NULL THEN
      RAISE WARNING 'Student not found for individual_lesson_id: %', NEW.individual_lesson_id;
      RETURN NEW;
    END IF;
    
    -- Вычисляем академические часы (если не указано, берем из продолжительности)
    IF v_academic_hours IS NULL OR v_academic_hours = 0 THEN
      v_academic_hours := COALESCE(NEW.duration, 60) / 45.0; -- 45 минут = 1 академ час
    END IF;
    
    -- Вычисляем стоимость (если цена указана за урок, делим на академ часы)
    IF v_price_per_hour IS NOT NULL AND v_price_per_hour > 0 THEN
      v_amount := v_price_per_hour * v_academic_hours;
    ELSE
      v_amount := 0;
    END IF;
    
    -- Создаем транзакцию списания (отрицательные значения)
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
      -ABS(v_amount), -- Списание (отрицательное)
      -ABS(v_academic_hours), -- Списание (отрицательное)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для индивидуальных занятий
DROP TRIGGER IF EXISTS trigger_individual_lesson_charge ON individual_lesson_sessions;
CREATE TRIGGER trigger_individual_lesson_charge
  AFTER UPDATE OF status ON individual_lesson_sessions
  FOR EACH ROW
  EXECUTE FUNCTION handle_individual_lesson_charge();

-- Функция для автоматического списания баланса при проведении группового занятия
CREATE OR REPLACE FUNCTION handle_group_lesson_charge()
RETURNS TRIGGER AS $$
DECLARE
  v_student RECORD;
  v_academic_hours NUMERIC;
  v_lesson_duration NUMERIC;
  v_group_name TEXT;
BEGIN
  -- Списываем только при переходе в статус 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Получаем информацию о группе
    SELECT name INTO v_group_name
    FROM learning_groups
    WHERE id = NEW.group_id;
    
    -- Вычисляем продолжительность занятия в академических часах
    v_lesson_duration := EXTRACT(EPOCH FROM (NEW.end_time::time - NEW.start_time::time)) / 60; -- минуты
    v_academic_hours := v_lesson_duration / 45.0; -- 45 минут = 1 академ час
    
    -- Списываем баланс для всех активных студентов группы
    FOR v_student IN 
      SELECT 
        gs.student_id,
        s.first_name || ' ' || s.last_name as student_name
      FROM group_students gs
      JOIN students s ON s.id = gs.student_id
      WHERE gs.group_id = NEW.group_id
        AND gs.status = 'active'
    LOOP
      -- Создаем транзакцию списания для каждого студента
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
        0, -- Для групповых пока не учитываем рубли (или можно рассчитать из тарифа группы)
        -ABS(v_academic_hours), -- Списание (отрицательное)
        'lesson_charge',
        'Списание за групповое занятие: ' || COALESCE(v_group_name, 'Группа'),
        NEW.id,
        NEW.group_id,
        NULL -- Можно добавить расчет цены за час из группы
      );
      
      RAISE NOTICE 'Charged % academic hours for student % (%) in group lesson %', 
        v_academic_hours, v_student.student_name, v_student.student_id, NEW.id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для групповых занятий
DROP TRIGGER IF EXISTS trigger_group_lesson_charge ON lesson_sessions;
CREATE TRIGGER trigger_group_lesson_charge
  AFTER UPDATE OF status ON lesson_sessions
  FOR EACH ROW
  EXECUTE FUNCTION handle_group_lesson_charge();

-- Функция для проверки баланса студента
CREATE OR REPLACE FUNCTION check_student_balance(
  p_student_id UUID,
  p_required_hours NUMERIC DEFAULT 4.0
)
RETURNS TABLE (
  has_sufficient_balance BOOLEAN,
  current_balance_hours NUMERIC,
  current_balance_rub NUMERIC,
  message TEXT
) AS $$
DECLARE
  v_balance_hours NUMERIC;
  v_balance_rub NUMERIC;
BEGIN
  -- Получаем текущий баланс студента
  SELECT 
    COALESCE(SUM(academic_hours), 0) as balance_hours,
    COALESCE(SUM(amount), 0) as balance_rub
  INTO v_balance_hours, v_balance_rub
  FROM balance_transactions
  WHERE student_id = p_student_id;
  
  -- Возвращаем результат проверки
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Даем права на выполнение функций
GRANT EXECUTE ON FUNCTION check_student_balance TO authenticated;

COMMENT ON FUNCTION handle_individual_lesson_charge IS 'Автоматически списывает баланс студента при проведении индивидуального занятия';
COMMENT ON FUNCTION handle_group_lesson_charge IS 'Автоматически списывает баланс всех студентов группы при проведении группового занятия';
COMMENT ON FUNCTION check_student_balance IS 'Проверяет достаточность баланса студента для записи на занятия';