-- Allow authenticated users to view client records that have chat messages
-- This fixes missing client chats when the clients join is filtered out by branch-based RLS

-- Create a permissive SELECT policy on clients for rows that are referenced by chat_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'clients' 
      AND policyname = 'Users can view clients linked to chat messages'
  ) THEN
    CREATE POLICY "Users can view clients linked to chat messages"
    ON public.clients
    FOR SELECT
    USING (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.chat_messages m
        WHERE m.client_id = clients.id
      )
    );
  END IF;
END $$;