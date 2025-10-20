-- Enable realtime for pinned_modals table
ALTER TABLE public.pinned_modals REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.pinned_modals;