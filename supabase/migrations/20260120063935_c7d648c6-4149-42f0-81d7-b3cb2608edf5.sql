-- Create RPC to get chat messages for teachers (bypasses org filter)
-- This is needed because teachers may have client records in different org contexts
CREATE OR REPLACE FUNCTION get_teacher_chat_messages(p_client_id uuid)
RETURNS TABLE (
  id uuid,
  client_id uuid,
  phone_number_id uuid,
  message_text text,
  message_type text,
  system_type text,
  is_read boolean,
  is_outgoing boolean,
  call_duration text,
  created_at timestamptz,
  file_url text,
  file_name text,
  file_type text,
  external_message_id text,
  messenger_type text,
  message_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the client is linked to an active teacher (security check)
  IF NOT EXISTS (
    SELECT 1 FROM get_teacher_unread_counts() tuc
    WHERE tuc.client_id = p_client_id
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    cm.id,
    cm.client_id,
    cm.phone_number_id,
    cm.message_text,
    cm.message_type,
    cm.system_type,
    cm.is_read,
    cm.is_outgoing,
    cm.call_duration,
    cm.created_at,
    cm.file_url,
    cm.file_name,
    cm.file_type,
    cm.external_message_id,
    cm.messenger_type::text,
    cm.message_status::text
  FROM chat_messages cm
  WHERE cm.client_id = p_client_id
  ORDER BY cm.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_teacher_chat_messages(uuid) TO authenticated;