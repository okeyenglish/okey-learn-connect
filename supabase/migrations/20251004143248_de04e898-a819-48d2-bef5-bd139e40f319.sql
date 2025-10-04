-- Add duration column to individual_lessons table
ALTER TABLE public.individual_lessons 
ADD COLUMN duration INTEGER DEFAULT 60;

COMMENT ON COLUMN public.individual_lessons.duration IS 'Продолжительность занятия в минутах (40, 60, 80, 100)';

-- Update existing lessons to have default duration
UPDATE public.individual_lessons 
SET duration = 60 
WHERE duration IS NULL;