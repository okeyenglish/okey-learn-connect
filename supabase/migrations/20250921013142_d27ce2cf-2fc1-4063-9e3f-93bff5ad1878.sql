-- Drop global unique constraint on clients.phone and replace with partial unique index (non-dash)
DO $$
BEGIN
  -- Drop existing unique constraint if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE t.relname = 'clients' AND c.conname = 'clients_phone_key'
  ) THEN
    ALTER TABLE public.clients DROP CONSTRAINT clients_phone_key;
  END IF;
END $$;

-- Create partial unique index that enforces uniqueness only when phone <> '-'
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_phone_unique_non_dash
ON public.clients (phone)
WHERE phone <> '-';

-- Optional: add supporting index for (name, branch) lookups used in ensureClient()
CREATE INDEX IF NOT EXISTS idx_clients_name_branch ON public.clients (name, branch);
