
-- Drop and recreate the function with fixed phone matching logic
DROP FUNCTION IF EXISTS get_teacher_unread_counts();

CREATE OR REPLACE FUNCTION get_teacher_unread_counts()
RETURNS TABLE (
  teacher_id UUID,
  client_id UUID,
  unread_count BIGINT,
  last_message_time TIMESTAMPTZ,
  last_message_text TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id AS teacher_id,
    c.id AS client_id,
    COALESCE(COUNT(*) FILTER (WHERE cm.is_read = false AND cm.message_type = 'client'), 0) AS unread_count,
    MAX(cm.created_at) AS last_message_time,
    (SELECT cm2.message_text FROM chat_messages cm2 WHERE cm2.client_id = c.id ORDER BY cm2.created_at DESC LIMIT 1) AS last_message_text
  FROM teachers t
  LEFT JOIN clients c ON (
    -- Match by normalized phone (digits only, 7XXXXXXXXXX format)
    regexp_replace(c.phone, '\D', '', 'g') = regexp_replace(t.phone, '\D', '', 'g')
    -- Match by whatsapp_chat_id which has format like 79687404426@c.us
    OR regexp_replace(c.whatsapp_chat_id, '@.*$', '') = regexp_replace(t.phone, '\D', '', 'g')
    -- Match with 8 -> 7 conversion
    OR regexp_replace(c.whatsapp_chat_id, '@.*$', '') = '7' || substring(regexp_replace(t.phone, '\D', '', 'g') from 2)
    -- Match by telegram_chat_id  
    OR c.telegram_chat_id = regexp_replace(t.phone, '\D', '', 'g')
    -- Match by max_chat_id
    OR c.max_chat_id = regexp_replace(t.phone, '\D', '', 'g')
  )
  LEFT JOIN chat_messages cm ON cm.client_id = c.id
  WHERE t.is_active = true
  GROUP BY t.id, c.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
