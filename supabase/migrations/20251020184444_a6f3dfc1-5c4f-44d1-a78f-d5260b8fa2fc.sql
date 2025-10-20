-- Add missing columns to students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female')),
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS lk_email TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_date_of_birth ON public.students(date_of_birth);
CREATE INDEX IF NOT EXISTS idx_students_gender ON public.students(gender);
CREATE INDEX IF NOT EXISTS idx_students_lk_email ON public.students(lk_email);

-- Add comment for documentation
COMMENT ON COLUMN public.students.gender IS 'Student gender: male or female';
COMMENT ON COLUMN public.students.avatar_url IS 'URL to student avatar image in storage';
COMMENT ON COLUMN public.students.date_of_birth IS 'Student date of birth';
COMMENT ON COLUMN public.students.lk_email IS 'Email for student personal account access';