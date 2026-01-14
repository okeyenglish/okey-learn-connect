-- Update function to mark messages as read by messenger (and update chat_messages.is_read)
CREATE OR REPLACE FUNCTION public.mark_chat_messages_as_read_by_messenger(
  p_client_id uuid,
  p_messenger_type text
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Update legacy/global read flag used by UI counters
  UPDATE public.chat_messages cm
  SET is_read = true
  WHERE cm.client_id = p_client_id
    AND cm.message_type = 'client'
    AND cm.is_read = false
    AND (
      (p_messenger_type = 'whatsapp' AND (cm.messenger_type::text = 'whatsapp' OR cm.messenger_type IS NULL))
      OR
      (p_messenger_type <> 'whatsapp' AND cm.messenger_type::text = p_messenger_type)
    );

  -- Keep per-user read receipts
  INSERT INTO public.message_read_status (message_id, user_id)
  SELECT cm.id, auth.uid()
  FROM public.chat_messages cm
  WHERE cm.client_id = p_client_id
    AND cm.message_type = 'client'
    AND (
      (p_messenger_type = 'whatsapp' AND (cm.messenger_type::text = 'whatsapp' OR cm.messenger_type IS NULL))
      OR
      (p_messenger_type <> 'whatsapp' AND cm.messenger_type::text = p_messenger_type)
    )
  ON CONFLICT (message_id, user_id)
  DO UPDATE SET read_at = now();
END;
$$;