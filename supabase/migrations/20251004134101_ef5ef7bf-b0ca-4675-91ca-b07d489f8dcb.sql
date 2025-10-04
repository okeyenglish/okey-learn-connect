-- Add is_additional column to individual_lesson_sessions
ALTER TABLE public.individual_lesson_sessions 
ADD COLUMN IF NOT EXISTS is_additional BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.individual_lesson_sessions.is_additional IS 'Indicates if this is an additional lesson outside the regular schedule';