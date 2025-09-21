-- Enable realtime for chat_states table
ALTER TABLE public.chat_states REPLICA IDENTITY FULL;

-- Add chat_states to realtime publication if not already added
DO $$
BEGIN
    -- Check if the table is already in the publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'chat_states'
    ) THEN
        -- Add table to publication
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_states;
    END IF;
END $$;