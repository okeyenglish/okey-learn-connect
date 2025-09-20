-- Create table for storing user's pinned modals
CREATE TABLE public.pinned_modals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  modal_id text NOT NULL,
  modal_type text NOT NULL,
  title text NOT NULL,
  props jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Ensure unique pinned modals per user
  UNIQUE(user_id, modal_id, modal_type)
);

-- Enable RLS
ALTER TABLE public.pinned_modals ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own pinned modals
CREATE POLICY "Users can view their own pinned modals"
  ON public.pinned_modals
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pinned modals"
  ON public.pinned_modals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pinned modals"
  ON public.pinned_modals
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pinned modals"
  ON public.pinned_modals
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pinned_modals_updated_at
  BEFORE UPDATE ON public.pinned_modals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();