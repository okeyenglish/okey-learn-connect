-- Add payment_id to individual_lesson_sessions to track which payment covers this lesson
ALTER TABLE public.individual_lesson_sessions 
ADD COLUMN payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX idx_individual_lesson_sessions_payment_id 
ON public.individual_lesson_sessions(payment_id);

-- Add comment
COMMENT ON COLUMN public.individual_lesson_sessions.payment_id IS 'Link to payment that covers this lesson session';
