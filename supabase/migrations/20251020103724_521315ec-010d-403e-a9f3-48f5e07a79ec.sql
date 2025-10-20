-- Этап 4: Функции для расчёта финансовой статистики групп

-- Функция для получения финансовой статистики группы
CREATE OR REPLACE FUNCTION get_group_debt_stats(p_group_id UUID)
RETURNS TABLE(
  total_students INTEGER,
  students_with_debt INTEGER,
  total_debt NUMERIC,
  total_paid NUMERIC,
  average_balance NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT gs.student_id)::INTEGER as total_students,
    COUNT(DISTINCT CASE WHEN sb.balance < 0 THEN gs.student_id END)::INTEGER as students_with_debt,
    COALESCE(SUM(CASE WHEN sb.balance < 0 THEN ABS(sb.balance) ELSE 0 END), 0) as total_debt,
    COALESCE(SUM(CASE WHEN sb.balance > 0 THEN sb.balance ELSE 0 END), 0) as total_paid,
    COALESCE(AVG(sb.balance), 0) as average_balance
  FROM group_students gs
  LEFT JOIN student_balances sb ON sb.student_id = gs.student_id
  WHERE gs.group_id = p_group_id 
    AND gs.status = 'active';
END;
$$;

-- Таблица для учёта выплат преподавателям за группы
CREATE TABLE IF NOT EXISTS teacher_group_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES learning_groups(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES profiles(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  lessons_count INTEGER NOT NULL DEFAULT 0,
  rate_per_lesson NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индексы для teacher_group_payments
CREATE INDEX IF NOT EXISTS idx_teacher_group_payments_group ON teacher_group_payments(group_id);
CREATE INDEX IF NOT EXISTS idx_teacher_group_payments_teacher ON teacher_group_payments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_group_payments_period ON teacher_group_payments(period_start, period_end);

-- RLS для teacher_group_payments
ALTER TABLE teacher_group_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage teacher payments"
  ON teacher_group_payments FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant'));

CREATE POLICY "Teachers can view their own payments"
  ON teacher_group_payments FOR SELECT
  USING (teacher_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant'));

-- Триггер для обновления updated_at
CREATE TRIGGER update_teacher_group_payments_updated_at
  BEFORE UPDATE ON teacher_group_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Функция для расчёта зарплаты преподавателя за период
CREATE OR REPLACE FUNCTION calculate_teacher_payment(
  p_group_id UUID,
  p_teacher_id UUID,
  p_period_start DATE,
  p_period_end DATE,
  p_rate_per_lesson NUMERIC
)
RETURNS TABLE(
  lessons_count INTEGER,
  total_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lessons_count INTEGER;
  v_total_amount NUMERIC;
BEGIN
  -- Подсчитываем количество проведённых занятий
  SELECT COUNT(*)
  INTO v_lessons_count
  FROM lesson_sessions ls
  WHERE ls.group_id = p_group_id
    AND ls.lesson_date BETWEEN p_period_start AND p_period_end
    AND ls.status IN ('completed', 'held');
  
  v_total_amount := v_lessons_count * p_rate_per_lesson;
  
  RETURN QUERY SELECT v_lessons_count, v_total_amount;
END;
$$;

COMMENT ON FUNCTION get_group_debt_stats IS 'Возвращает финансовую статистику по группе: количество студентов, долги, оплаты';
COMMENT ON FUNCTION calculate_teacher_payment IS 'Рассчитывает зарплату преподавателя за период на основе проведённых занятий';
COMMENT ON TABLE teacher_group_payments IS 'Учёт выплат преподавателям за групповые занятия';