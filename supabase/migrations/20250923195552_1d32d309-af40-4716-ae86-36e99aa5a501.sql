-- Ensure only one active (pending/processing) GPT suggestion per client
BEGIN;

-- Cleanup duplicates, keep the newest per client
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY created_at DESC) AS rn
  FROM public.pending_gpt_responses
  WHERE status IN ('pending','processing')
)
DELETE FROM public.pending_gpt_responses p
USING ranked r
WHERE p.id = r.id
AND r.rn > 1;

-- Partial unique index to prevent duplicates going forward
CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_gpt_single_active_per_client
ON public.pending_gpt_responses (client_id)
WHERE status IN ('pending','processing');

COMMIT;