-- Добавляем новые поля в таблицу individual_lessons
ALTER TABLE public.individual_lessons
ADD COLUMN IF NOT EXISTS academic_hours_per_day numeric DEFAULT 1,
ADD COLUMN IF NOT EXISTS break_minutes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS color text DEFAULT '#ffffff';