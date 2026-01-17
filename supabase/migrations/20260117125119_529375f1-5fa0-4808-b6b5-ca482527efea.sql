CREATE OR REPLACE FUNCTION get_chat_threads_fast(
  p_limit INT DEFAULT 200
)
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  client_phone TEXT,
  last_message TEXT,
  last_message_time TIMESTAMPTZ,
  unread_count BIGINT,
  unread_whatsapp BIGINT,
  unread_telegram BIGINT,
  unread_max BIGINT,
  unread_email BIGINT,
  unread_calls BIGINT,
  last_unread_messenger TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH latest_messages AS (
    SELECT DISTINCT ON (cm.client_id)
      cm.client_id,
      cm.message_text,
      cm.created_at,
      cm.messenger_type
    FROM chat_messages cm
    ORDER BY cm.client_id, cm.created_at DESC
  ),
  unread_counts AS (
    SELECT 
      cm.client_id,
      COUNT(*) as total_unread,
      COUNT(*) FILTER (WHERE cm.messenger_type = 'whatsapp'::messenger_type OR cm.messenger_type IS NULL) as unread_whatsapp,
      COUNT(*) FILTER (WHERE cm.messenger_type = 'telegram'::messenger_type) as unread_telegram,
      COUNT(*) FILTER (WHERE cm.messenger_type = 'max'::messenger_type) as unread_max,
      (array_agg(cm.messenger_type::TEXT ORDER BY cm.created_at DESC))[1] as last_messenger
    FROM chat_messages cm
    WHERE cm.is_read = false
      AND cm.message_type = 'client'
    GROUP BY cm.client_id
  )
  SELECT 
    lm.client_id,
    COALESCE(c.name, '')::TEXT as client_name,
    COALESCE(c.phone, cpn.phone, '')::TEXT as client_phone,
    COALESCE(lm.message_text, '')::TEXT as last_message,
    lm.created_at as last_message_time,
    COALESCE(uc.total_unread, 0) as unread_count,
    COALESCE(uc.unread_whatsapp, 0) as unread_whatsapp,
    COALESCE(uc.unread_telegram, 0) as unread_telegram,
    COALESCE(uc.unread_max, 0) as unread_max,
    0::BIGINT as unread_email,
    0::BIGINT as unread_calls,
    uc.last_messenger::TEXT as last_unread_messenger
  FROM latest_messages lm
  LEFT JOIN clients c ON c.id = lm.client_id
  LEFT JOIN client_phone_numbers cpn ON cpn.client_id = lm.client_id AND cpn.is_primary = true
  LEFT JOIN unread_counts uc ON uc.client_id = lm.client_id
  ORDER BY lm.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;