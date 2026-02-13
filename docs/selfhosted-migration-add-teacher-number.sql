-- Migration: Add teacher_number column to teachers table
-- Уникальный отображаемый ID для преподавателей в формате T00001
-- Apply this manually to self-hosted Supabase at api.academyos.ru

-- Step 1: Add teacher_number column
ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS teacher_number TEXT;

-- Step 2: Create function for auto-generating teacher_number
CREATE OR REPLACE FUNCTION public.generate_teacher_number()
RETURNS TRIGGER AS $$
DECLARE next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(teacher_number FROM '[0-9]+$') AS integer)), 0) + 1
  INTO next_num FROM public.teachers WHERE organization_id = NEW.organization_id;
  NEW.teacher_number := 'T' || LPAD(next_num::text, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Step 3: Create trigger on INSERT
DROP TRIGGER IF EXISTS set_teacher_number ON public.teachers;
CREATE TRIGGER set_teacher_number
BEFORE INSERT ON public.teachers
FOR EACH ROW WHEN (NEW.teacher_number IS NULL)
EXECUTE FUNCTION public.generate_teacher_number();

-- Step 4: Backfill existing teachers
WITH numbered AS (
  SELECT id, organization_id,
    ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY created_at) as rn
  FROM public.teachers WHERE teacher_number IS NULL
)
UPDATE public.teachers SET teacher_number = 'T' || LPAD(numbered.rn::text, 5, '0')
FROM numbered WHERE teachers.id = numbered.id;

-- Step 5: Verify
SELECT id, first_name, last_name, teacher_number FROM public.teachers ORDER BY teacher_number;
