-- ============================================
-- SQL Migration: Добавление настроек оплаты сотрудников
-- Применить вручную на api.academyos.ru
-- ============================================

-- =============================================
-- 1. Добавляем колонки в employee_invitations
-- =============================================

-- Тип оплаты: 'monthly' (оклад) или 'daily' (за день)
ALTER TABLE public.employee_invitations 
ADD COLUMN IF NOT EXISTS salary_type text DEFAULT 'monthly';

-- Оклад (для monthly)
ALTER TABLE public.employee_invitations 
ADD COLUMN IF NOT EXISTS base_salary numeric DEFAULT NULL;

-- Дата начала начисления (для пропорционального расчёта первого месяца)
ALTER TABLE public.employee_invitations 
ADD COLUMN IF NOT EXISTS salary_start_date date DEFAULT NULL;

-- Ставка за день (для daily)
ALTER TABLE public.employee_invitations 
ADD COLUMN IF NOT EXISTS daily_rate numeric DEFAULT NULL;

-- Рабочие дни (для daily): ['mon', 'tue', 'wed', 'thu', 'fri']
ALTER TABLE public.employee_invitations 
ADD COLUMN IF NOT EXISTS work_days text[] DEFAULT '{}';

-- Добавляем комментарии
COMMENT ON COLUMN public.employee_invitations.salary_type IS 'Тип оплаты: monthly (фикс. оклад) или daily (за день)';
COMMENT ON COLUMN public.employee_invitations.base_salary IS 'Фиксированный месячный оклад (для salary_type=monthly)';
COMMENT ON COLUMN public.employee_invitations.salary_start_date IS 'Дата начала работы для пропорционального расчёта первого месяца';
COMMENT ON COLUMN public.employee_invitations.daily_rate IS 'Ставка за рабочий день (для salary_type=daily)';
COMMENT ON COLUMN public.employee_invitations.work_days IS 'Массив рабочих дней: mon, tue, wed, thu, fri, sat, sun';

-- =============================================
-- 2. Добавляем колонки в profiles
-- =============================================

-- Тип оплаты
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS salary_type text DEFAULT 'monthly';

-- Оклад
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS base_salary numeric DEFAULT NULL;

-- Дата начала начисления
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS salary_start_date date DEFAULT NULL;

-- Ставка за день
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS daily_rate numeric DEFAULT NULL;

-- Рабочие дни
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS work_days text[] DEFAULT '{}';

-- Комментарии для profiles
COMMENT ON COLUMN public.profiles.salary_type IS 'Тип оплаты: monthly (фикс. оклад) или daily (за день)';
COMMENT ON COLUMN public.profiles.base_salary IS 'Фиксированный месячный оклад (для salary_type=monthly)';
COMMENT ON COLUMN public.profiles.salary_start_date IS 'Дата начала работы для пропорционального расчёта первого месяца';
COMMENT ON COLUMN public.profiles.daily_rate IS 'Ставка за рабочий день (для salary_type=daily)';
COMMENT ON COLUMN public.profiles.work_days IS 'Массив рабочих дней: mon, tue, wed, thu, fri, sat, sun';

-- =============================================
-- 3. Проверка миграции
-- =============================================
-- После выполнения можно проверить:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'employee_invitations' 
--   AND column_name IN ('salary_type', 'base_salary', 'salary_start_date', 'daily_rate', 'work_days');
