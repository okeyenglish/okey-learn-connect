-- ============================================================
-- Шаг 3: Система зарплат преподавателей
-- ============================================================

-- 1. Ставки преподавателей
CREATE TABLE IF NOT EXISTS public.teacher_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rate_type TEXT NOT NULL CHECK (rate_type IN ('global', 'branch', 'subject', 'personal')),
  branch TEXT,
  subject TEXT,
  rate_per_academic_hour NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RUB',
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Начисления зарплаты (создаются автоматически при проведении урока)
CREATE TABLE IF NOT EXISTS public.teacher_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_session_id UUID REFERENCES public.lesson_sessions(id) ON DELETE SET NULL,
  individual_lesson_session_id UUID REFERENCES public.individual_lesson_sessions(id) ON DELETE SET NULL,
  earning_date DATE NOT NULL,
  academic_hours NUMERIC NOT NULL,
  rate_per_hour NUMERIC NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RUB',
  status TEXT NOT NULL DEFAULT 'accrued' CHECK (status IN ('accrued', 'paid', 'cancelled')),
  payment_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Выплаты преподавателям
CREATE TABLE IF NOT EXISTS public.teacher_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('advance', 'balance', 'salary', 'bonus', 'penalty')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_hours NUMERIC NOT NULL DEFAULT 0,
  rate_per_hour NUMERIC,
  calculated_amount NUMERIC NOT NULL DEFAULT 0,
  adjustments NUMERIC NOT NULL DEFAULT 0,
  final_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RUB',
  payment_date DATE,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Добавляем поля в lesson_sessions для бесплатных уроков
ALTER TABLE public.lesson_sessions 
  ADD COLUMN IF NOT EXISTS is_free_for_student BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_free_for_teacher BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS teacher_hours_coefficient NUMERIC NOT NULL DEFAULT 1.0 CHECK (teacher_hours_coefficient >= 0);

-- 5. То же для индивидуальных занятий
ALTER TABLE public.individual_lesson_sessions 
  ADD COLUMN IF NOT EXISTS is_free_for_student BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_free_for_teacher BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS teacher_hours_coefficient NUMERIC NOT NULL DEFAULT 1.0 CHECK (teacher_hours_coefficient >= 0);

-- 6. Индексы
CREATE INDEX IF NOT EXISTS idx_teacher_rates_teacher ON public.teacher_rates(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_rates_active ON public.teacher_rates(is_active);
CREATE INDEX IF NOT EXISTS idx_teacher_earnings_teacher ON public.teacher_earnings(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_earnings_date ON public.teacher_earnings(earning_date);
CREATE INDEX IF NOT EXISTS idx_teacher_earnings_status ON public.teacher_earnings(status);
CREATE INDEX IF NOT EXISTS idx_teacher_payments_teacher ON public.teacher_payments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_payments_period ON public.teacher_payments(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_teacher_payments_status ON public.teacher_payments(status);

-- 7. Триггеры для updated_at
DROP TRIGGER IF EXISTS update_teacher_rates_updated_at ON public.teacher_rates;
CREATE TRIGGER update_teacher_rates_updated_at
  BEFORE UPDATE ON public.teacher_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teacher_earnings_updated_at ON public.teacher_earnings;
CREATE TRIGGER update_teacher_earnings_updated_at
  BEFORE UPDATE ON public.teacher_earnings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teacher_payments_updated_at ON public.teacher_payments;
CREATE TRIGGER update_teacher_payments_updated_at
  BEFORE UPDATE ON public.teacher_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. RLS политики

-- teacher_rates
ALTER TABLE public.teacher_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage teacher rates"
  ON public.teacher_rates FOR ALL
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Teachers can view their own rates"
  ON public.teacher_rates FOR SELECT
  USING (
    auth.uid() = teacher_id OR
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager')
  );

-- teacher_earnings
ALTER TABLE public.teacher_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage earnings"
  ON public.teacher_earnings FOR ALL
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager') OR
    has_role(auth.uid(), 'accountant')
  );

CREATE POLICY "Teachers can view their own earnings"
  ON public.teacher_earnings FOR SELECT
  USING (
    auth.uid() = teacher_id OR
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager') OR
    has_role(auth.uid(), 'accountant')
  );

-- teacher_payments
ALTER TABLE public.teacher_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payments"
  ON public.teacher_payments FOR ALL
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager') OR
    has_role(auth.uid(), 'accountant')
  );

CREATE POLICY "Teachers can view their own payments"
  ON public.teacher_payments FOR SELECT
  USING (
    auth.uid() = teacher_id OR
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'manager') OR
    has_role(auth.uid(), 'accountant')
  );

-- 9. RPC функция для получения ставки преподавателя
CREATE OR REPLACE FUNCTION get_teacher_rate(
  _teacher_id UUID,
  _branch TEXT DEFAULT NULL,
  _subject TEXT DEFAULT NULL,
  _date DATE DEFAULT CURRENT_DATE
)
RETURNS NUMERIC AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RPC функция для начисления зарплаты за урок
CREATE OR REPLACE FUNCTION accrue_teacher_earning_for_lesson(
  _lesson_session_id UUID DEFAULT NULL,
  _individual_lesson_session_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_teacher_id UUID;
  v_teacher_name TEXT;
  v_lesson_date DATE;
  v_duration INTEGER;
  v_branch TEXT;
  v_subject TEXT;
  v_is_free BOOLEAN;
  v_coefficient NUMERIC;
  v_rate NUMERIC;
  v_academic_hours NUMERIC;
  v_amount NUMERIC;
  v_earning_id UUID;
  v_existing_id UUID;
BEGIN
  -- Получаем данные урока
  IF _lesson_session_id IS NOT NULL THEN
    SELECT 
      ls.teacher_name,
      ls.lesson_date,
      EXTRACT(EPOCH FROM (ls.end_time - ls.start_time)) / 60,
      ls.branch,
      lg.subject,
      ls.is_free_for_teacher,
      ls.teacher_hours_coefficient
    INTO 
      v_teacher_name,
      v_lesson_date,
      v_duration,
      v_branch,
      v_subject,
      v_is_free,
      v_coefficient
    FROM lesson_sessions ls
    LEFT JOIN learning_groups lg ON lg.id = ls.group_id
    WHERE ls.id = _lesson_session_id;
  ELSIF _individual_lesson_session_id IS NOT NULL THEN
    SELECT 
      il.teacher_name,
      ils.lesson_date,
      ils.duration,
      il.branch,
      il.subject,
      ils.is_free_for_teacher,
      ils.teacher_hours_coefficient
    INTO 
      v_teacher_name,
      v_lesson_date,
      v_duration,
      v_branch,
      v_subject,
      v_is_free,
      v_coefficient
    FROM individual_lesson_sessions ils
    JOIN individual_lessons il ON il.id = ils.individual_lesson_id
    WHERE ils.id = _individual_lesson_session_id;
  ELSE
    RAISE EXCEPTION 'Необходимо указать ID урока';
  END IF;
  
  -- Если урок бесплатный для преподавателя, не начисляем
  IF v_is_free THEN
    RETURN NULL;
  END IF;
  
  -- Находим teacher_id по имени
  SELECT p.id INTO v_teacher_id
  FROM profiles p
  WHERE (p.first_name || ' ' || p.last_name) = v_teacher_name
     OR p.email = v_teacher_name
  LIMIT 1;
  
  IF v_teacher_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Проверяем, нет ли уже начисления
  SELECT id INTO v_existing_id
  FROM teacher_earnings
  WHERE (lesson_session_id = _lesson_session_id OR individual_lesson_session_id = _individual_lesson_session_id)
    AND status != 'cancelled';
  
  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;
  
  -- Получаем ставку
  v_rate := get_teacher_rate(v_teacher_id, v_branch, v_subject, v_lesson_date);
  
  IF v_rate = 0 THEN
    RETURN NULL;
  END IF;
  
  -- Рассчитываем ак.часы и сумму
  v_academic_hours := (v_duration / 40.0) * v_coefficient;
  v_amount := v_academic_hours * v_rate;
  
  -- Создаём начисление
  INSERT INTO teacher_earnings (
    teacher_id,
    lesson_session_id,
    individual_lesson_session_id,
    earning_date,
    academic_hours,
    rate_per_hour,
    amount,
    status
  ) VALUES (
    v_teacher_id,
    _lesson_session_id,
    _individual_lesson_session_id,
    v_lesson_date,
    v_academic_hours,
    v_rate,
    v_amount,
    'accrued'
  )
  RETURNING id INTO v_earning_id;
  
  RETURN v_earning_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. RPC функция для расчёта зарплаты за период
CREATE OR REPLACE FUNCTION calculate_teacher_salary(
  _teacher_id UUID,
  _period_start DATE,
  _period_end DATE
)
RETURNS TABLE(
  total_hours NUMERIC,
  total_amount NUMERIC,
  accrued_count INTEGER,
  paid_count INTEGER
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;