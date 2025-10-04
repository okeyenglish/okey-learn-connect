-- Create attendance records table for tracking student attendance
CREATE TABLE IF NOT EXISTS public.student_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_session_id UUID REFERENCES public.lesson_sessions(id) ON DELETE CASCADE,
  individual_lesson_session_id UUID REFERENCES public.individual_lesson_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'present', -- 'present', 'absent', 'late', 'excused'
  notes TEXT,
  marked_by UUID REFERENCES auth.users(id),
  marked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT attendance_session_check CHECK (
    (lesson_session_id IS NOT NULL AND individual_lesson_session_id IS NULL) OR
    (lesson_session_id IS NULL AND individual_lesson_session_id IS NOT NULL)
  )
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_lesson_session ON public.student_attendance(lesson_session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_individual_session ON public.student_attendance(individual_lesson_session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.student_attendance(student_id);

-- Enable RLS
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers and admins can manage attendance
CREATE POLICY "Teachers and admins can manage attendance"
ON public.student_attendance
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'teacher'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'teacher'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
);

-- Policy: Students can view their own attendance
CREATE POLICY "Students can view their own attendance"
ON public.student_attendance
FOR SELECT
USING (
  student_id IN (
    SELECT s.id FROM public.students s
    JOIN public.profiles p ON p.phone = s.phone
    WHERE p.id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_student_attendance_updated_at
BEFORE UPDATE ON public.student_attendance
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();