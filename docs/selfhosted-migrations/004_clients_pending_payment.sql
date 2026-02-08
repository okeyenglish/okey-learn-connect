-- =====================================================
-- Migration: Add pending payment tracking to clients
-- For self-hosted Supabase (api.academyos.ru)
-- =====================================================

-- Add column to track unconfirmed payments
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS has_pending_payment boolean DEFAULT false;

-- Index for fast lookup of pending payments
CREATE INDEX IF NOT EXISTS idx_clients_has_pending_payment 
ON public.clients(has_pending_payment) 
WHERE has_pending_payment = true;

-- Comment for documentation
COMMENT ON COLUMN public.clients.has_pending_payment IS 
'Flag indicating client has made a payment that has not yet been marked as processed by staff';

-- =====================================================
-- Verification query (run after migration)
-- =====================================================
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'clients' AND column_name = 'has_pending_payment';
