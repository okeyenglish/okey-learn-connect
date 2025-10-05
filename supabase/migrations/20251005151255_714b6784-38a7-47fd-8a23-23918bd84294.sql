-- Enable Realtime for payments table so UI updates instantly
-- 1) Ensure replica identity is FULL to include row data in change payloads
DO $$ BEGIN
  EXECUTE 'ALTER TABLE public.payments REPLICA IDENTITY FULL';
EXCEPTION WHEN undefined_table THEN
  RAISE EXCEPTION 'Table public.payments does not exist. Please create it first.';
WHEN others THEN
  -- ignore if already set or other non-critical issues
  NULL;
END $$;

-- 2) Add the table to the supabase_realtime publication if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'payments'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.payments';
  END IF;
END $$;