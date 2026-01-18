-- Фаза 2: Расширение системы ставок преподавателей (как в Hollihope)

-- 1. Добавляем новые поля в teacher_rates
ALTER TABLE teacher_rates 
ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES learning_groups(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS individual_lesson_id uuid REFERENCES individual_lessons(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS min_students integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_students integer,
ADD COLUMN IF NOT EXISTS bonus_percentage numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS external_id text,
ADD COLUMN IF NOT EXISTS holihope_metadata jsonb;

-- Комментарии
COMMENT ON COLUMN teacher_rates.group_id IS 'Привязка ставки к конкретной группе (null = для всех групп)';
COMMENT ON COLUMN teacher_rates.individual_lesson_id IS 'Привязка ставки к конкретному индивидуальному занятию';
COMMENT ON COLUMN teacher_rates.min_students IS 'Минимальное количество учеников для плавающей ставки';
COMMENT ON COLUMN teacher_rates.max_students IS 'Максимальное количество учеников для плавающей ставки';
COMMENT ON COLUMN teacher_rates.bonus_percentage IS 'Процент бонуса от стоимости занятия';

-- 2. Создаём таблицу плавающих ставок (зависят от количества учеников)
CREATE TABLE IF NOT EXISTS teacher_floating_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_id uuid NOT NULL REFERENCES teacher_rates(id) ON DELETE CASCADE,
  student_count integer NOT NULL,
  rate_amount numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(rate_id, student_count)
);

COMMENT ON TABLE teacher_floating_rates IS 'Плавающие ставки преподавателя в зависимости от количества учеников на занятии';

-- RLS для teacher_floating_rates
ALTER TABLE teacher_floating_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view floating rates" ON teacher_floating_rates
  FOR SELECT USING (true);

CREATE POLICY "Users can manage floating rates" ON teacher_floating_rates
  FOR ALL USING (true);

-- 3. Создаём таблицу корректировок зарплаты (бонусы/удержания)
CREATE TABLE IF NOT EXISTS teacher_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('bonus', 'deduction', 'penalty', 'other')),
  amount numeric NOT NULL,
  currency text DEFAULT 'RUB',
  adjustment_date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  external_id text,
  holihope_metadata jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE teacher_adjustments IS 'Бонусы, удержания и корректировки зарплаты преподавателя';

-- RLS для teacher_adjustments
ALTER TABLE teacher_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view adjustments" ON teacher_adjustments
  FOR SELECT USING (true);

CREATE POLICY "Users can manage adjustments" ON teacher_adjustments
  FOR ALL USING (true);

-- 4. Индексы
CREATE INDEX IF NOT EXISTS idx_teacher_rates_group ON teacher_rates(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_teacher_rates_individual ON teacher_rates(individual_lesson_id) WHERE individual_lesson_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_teacher_adjustments_teacher ON teacher_adjustments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_adjustments_date ON teacher_adjustments(adjustment_date);
CREATE INDEX IF NOT EXISTS idx_teacher_floating_rates_rate ON teacher_floating_rates(rate_id);

-- 5. Добавляем teacher_coefficient в teacher_earnings для учёта коэффициента при начислении
ALTER TABLE teacher_earnings
ADD COLUMN IF NOT EXISTS teacher_coefficient numeric DEFAULT 1.0;

COMMENT ON COLUMN teacher_earnings.teacher_coefficient IS 'Коэффициент оплаты преподавателю за это занятие';