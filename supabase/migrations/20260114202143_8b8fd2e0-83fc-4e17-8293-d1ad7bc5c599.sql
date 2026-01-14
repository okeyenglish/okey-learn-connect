-- Create function to mark messages as read by messenger type
CREATE OR REPLACE FUNCTION public.mark_chat_messages_as_read_by_messenger(
  p_client_id uuid,
  p_messenger_type text
)
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
    AND (cm.messenger_type = p_messenger_type OR (p_messenger_type = 'whatsapp' AND cm.messenger_type IS NULL))
  ON CONFLICT (message_id, user_id) 
  DO UPDATE SET read_at = now();
END;
$$;