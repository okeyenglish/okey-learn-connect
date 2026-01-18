-- Фаза 1.1: Расширение системы статусов занятий и коэффициентов оплаты

-- 1. Добавляем новые значения в enum lesson_status
ALTER TYPE lesson_status ADD VALUE IF NOT EXISTS 'partial_payment';
ALTER TYPE lesson_status ADD VALUE IF NOT EXISTS 'partial_skip';
ALTER TYPE lesson_status ADD VALUE IF NOT EXISTS 'penalty';

-- 2. Добавляем поля коэффициентов в student_lesson_sessions
ALTER TABLE student_lesson_sessions 
ADD COLUMN IF NOT EXISTS payment_coefficient numeric DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS teacher_coefficient numeric DEFAULT 1.0;

-- Комментарии для документации
COMMENT ON COLUMN student_lesson_sessions.payment_coefficient IS 'Коэффициент оплаты занятия студентом (0.5 = 50%, 1.5 = 150% штраф)';
COMMENT ON COLUMN student_lesson_sessions.teacher_coefficient IS 'Коэффициент оплаты преподавателю за это занятие';

-- 3. Добавляем поля коэффициентов в lesson_sessions (для групповых действий)
ALTER TABLE lesson_sessions 
ADD COLUMN IF NOT EXISTS student_payment_coefficient numeric DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS teacher_payment_coefficient numeric DEFAULT 1.0;

COMMENT ON COLUMN lesson_sessions.student_payment_coefficient IS 'Коэффициент оплаты по умолчанию для всех студентов на занятии';
COMMENT ON COLUMN lesson_sessions.teacher_payment_coefficient IS 'Коэффициент оплаты преподавателю за занятие';

-- 4. Добавляем аналогичные поля в individual_lesson_sessions
ALTER TABLE individual_lesson_sessions 
ADD COLUMN IF NOT EXISTS payment_coefficient numeric DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS teacher_coefficient numeric DEFAULT 1.0;

COMMENT ON COLUMN individual_lesson_sessions.payment_coefficient IS 'Коэффициент оплаты занятия студентом';
COMMENT ON COLUMN individual_lesson_sessions.teacher_coefficient IS 'Коэффициент оплаты преподавателю';