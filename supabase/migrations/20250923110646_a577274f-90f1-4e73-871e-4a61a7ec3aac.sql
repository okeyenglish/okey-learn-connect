-- Enable realtime for pending_gpt_responses table
ALTER TABLE public.pending_gpt_responses REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.pending_gpt_responses;