-- Enable realtime for clients table safely
ALTER TABLE public.clients REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'clients'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
  END IF;
END $$;