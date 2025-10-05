-- Add group_id to payments to support group lesson payments
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.learning_groups(id) ON DELETE SET NULL;

-- Optional: index for faster queries by group
CREATE INDEX IF NOT EXISTS idx_payments_group_id ON public.payments(group_id);
