-- Add columns to payments table to track individual lesson payments
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS individual_lesson_id UUID REFERENCES public.individual_lessons(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS lessons_count INTEGER DEFAULT 0;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_individual_lesson ON public.payments(individual_lesson_id);

COMMENT ON COLUMN public.payments.individual_lesson_id IS 'Reference to individual lesson if payment is for individual lessons';
COMMENT ON COLUMN public.payments.lessons_count IS 'Number of lessons covered by this payment';