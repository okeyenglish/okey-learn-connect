-- Drop and recreate get_chat_threads_fast to include message text
DROP FUNCTION IF EXISTS public.get_chat_threads_fast(integer);

CREATE OR REPLACE FUNCTION public.get_chat_threads_fast(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  clt_id UUID,
  client_name TEXT,
  client_phone TEXT,
  avatar_url TEXT,
  telegram_avatar_url TEXT,
  whatsapp_avatar_url TEXT,
  max_avatar_url TEXT,
  telegram_chat_id TEXT,
  whatsapp_chat_id TEXT,
  max_chat_id TEXT,
  last_message_text TEXT,
  last_message_time TIMESTAMPTZ,
  last_messenger_type TEXT,
  unread_count BIGINT,
  last_unread_messenger TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  v_org_id := get_user_organization_id();
  
  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH last_msgs AS (
    SELECT DISTINCT ON (cm.client_id)
      cm.client_id AS cid,
      cm.message_text,
      cm.messenger_type::TEXT AS msg_type
    FROM chat_messages cm
    WHERE cm.organization_id = v_org_id
    ORDER BY cm.client_id, cm.created_at DESC
  )
  SELECT 
    c.id AS clt_id,
    c.name::TEXT AS client_name,
    c.phone::TEXT AS client_phone,
    c.avatar_url::TEXT,
    c.telegram_avatar_url::TEXT,
    c.whatsapp_avatar_url::TEXT,
    c.max_avatar_url::TEXT,
    c.telegram_chat_id::TEXT,
    c.whatsapp_chat_id::TEXT,
    c.max_chat_id::TEXT,
    lm.message_text::TEXT AS last_message_text,
    c.last_message_at AS last_message_time,
    lm.msg_type::TEXT AS last_messenger_type,
    0::BIGINT AS unread_count,
    NULL::TEXT AS last_unread_messenger
  FROM clients c
  LEFT JOIN last_msgs lm ON lm.cid = c.id
  WHERE c.organization_id = v_org_id
    AND c.last_message_at IS NOT NULL
    AND c.name NOT IN ('Telegram Group', 'Corporate Chat', 'Teachers Chat', 'Communities Chat')
    AND (c.telegram_chat_id IS NULL OR c.telegram_chat_id NOT LIKE '-%')
  ORDER BY c.last_message_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_chat_threads_fast(integer) TO authenticated;