-- Create table for tracking message read status by individual users
CREATE TABLE IF NOT EXISTS public.message_read_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Add foreign key constraints
ALTER TABLE public.message_read_status 
ADD CONSTRAINT fk_message_read_status_message_id 
FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE CASCADE;

ALTER TABLE public.message_read_status 
ADD CONSTRAINT fk_message_read_status_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.message_read_status ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view message read status for accessible messages" 
ON public.message_read_status 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.chat_messages cm 
    WHERE cm.id = message_read_status.message_id
  )
);

CREATE POLICY "Users can insert their own read status" 
ON public.message_read_status 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own read status" 
ON public.message_read_status 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_message_read_status_message_id ON public.message_read_status(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_status_user_id ON public.message_read_status(user_id);
CREATE INDEX IF NOT EXISTS idx_message_read_status_read_at ON public.message_read_status(read_at);

-- Create function to mark message as read
CREATE OR REPLACE FUNCTION public.mark_message_as_read(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.message_read_status (message_id, user_id)
  VALUES (p_message_id, auth.uid())
  ON CONFLICT (message_id, user_id) 
  DO UPDATE SET read_at = now();
END;
$$;

-- Create function to mark all messages in chat as read
CREATE OR REPLACE FUNCTION public.mark_chat_messages_as_read(p_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.message_read_status (message_id, user_id)
  SELECT cm.id, auth.uid()
  FROM public.chat_messages cm
  WHERE cm.client_id = p_client_id
  ON CONFLICT (message_id, user_id) 
  DO UPDATE SET read_at = now();
END;
$$;

-- Create function to get message read status with user info
CREATE OR REPLACE FUNCTION public.get_message_read_status(p_message_id uuid)
RETURNS TABLE(
  user_id uuid,
  user_name text,
  read_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    mrs.user_id,
    COALESCE(p.first_name || ' ' || p.last_name, p.email, 'Unknown User') as user_name,
    mrs.read_at
  FROM public.message_read_status mrs
  LEFT JOIN public.profiles p ON p.id = mrs.user_id
  WHERE mrs.message_id = p_message_id
  ORDER BY mrs.read_at ASC;
$$;