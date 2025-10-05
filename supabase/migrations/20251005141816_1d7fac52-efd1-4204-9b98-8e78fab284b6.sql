-- Добавляем недостающие колонки в таблицу student_lesson_sessions
ALTER TABLE public.student_lesson_sessions
ADD COLUMN IF NOT EXISTS attendance_status TEXT DEFAULT 'not_marked',
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'not_paid',
ADD COLUMN IF NOT EXISTS payment_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS is_cancelled_for_student BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Добавляем CHECK constraints для валидации
ALTER TABLE public.student_lesson_sessions
DROP CONSTRAINT IF EXISTS student_lesson_sessions_attendance_status_check,
ADD CONSTRAINT student_lesson_sessions_attendance_status_check 
  CHECK (attendance_status IN ('present', 'absent', 'excused', 'late', 'not_marked'));

ALTER TABLE public.student_lesson_sessions
DROP CONSTRAINT IF EXISTS student_lesson_sessions_payment_status_check,
ADD CONSTRAINT student_lesson_sessions_payment_status_check 
  CHECK (payment_status IN ('paid', 'not_paid', 'free', 'bonus'));

-- Добавляем индекс для payment_id если его нет
CREATE INDEX IF NOT EXISTS idx_student_lesson_sessions_payment 
ON public.student_lesson_sessions(payment_id);

-- Теперь заполняем таблицу для всех существующих групповых занятий
INSERT INTO public.student_lesson_sessions (lesson_session_id, student_id)
SELECT 
  ls.id as lesson_session_id,
  gs.student_id
FROM public.lesson_sessions ls
JOIN public.group_students gs ON gs.group_id = ls.group_id
WHERE ls.group_id IS NOT NULL 
  AND gs.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.student_lesson_sessions sls 
    WHERE sls.lesson_session_id = ls.id 
    AND sls.student_id = gs.student_id
  )
ON CONFLICT (lesson_session_id, student_id) DO NOTHING;