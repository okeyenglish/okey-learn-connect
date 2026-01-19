-- Create RPC function to get teacher unread message counts by linking teachers to clients via phone
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
    COALESCE(COUNT(*) FILTER (WHERE cm.is_read = false AND cm.is_outgoing = false), 0)::BIGINT AS unread_count,
    MAX(cm.created_at) AS last_message_time,
    (SELECT cm2.message_text FROM chat_messages cm2 WHERE cm2.client_id = c.id ORDER BY cm2.created_at DESC LIMIT 1) AS last_message_text
  FROM teachers t
  LEFT JOIN clients c ON (
    -- Normalize phones: remove all non-digits and compare
    -- Handle formats: +7 (916) 123-45-67, 89161234567, 79161234567
    CASE 
      WHEN LENGTH(regexp_replace(t.phone, '\D', '', 'g')) = 11 
           AND LEFT(regexp_replace(t.phone, '\D', '', 'g'), 1) = '8'
      THEN '7' || RIGHT(regexp_replace(t.phone, '\D', '', 'g'), 10)
      WHEN LENGTH(regexp_replace(t.phone, '\D', '', 'g')) = 10
      THEN '7' || regexp_replace(t.phone, '\D', '', 'g')
      ELSE regexp_replace(t.phone, '\D', '', 'g')
    END
    =
    CASE 
      WHEN LENGTH(regexp_replace(c.phone, '\D', '', 'g')) = 11 
           AND LEFT(regexp_replace(c.phone, '\D', '', 'g'), 1) = '8'
      THEN '7' || RIGHT(regexp_replace(c.phone, '\D', '', 'g'), 10)
      WHEN LENGTH(regexp_replace(c.phone, '\D', '', 'g')) = 10
      THEN '7' || regexp_replace(c.phone, '\D', '', 'g')
      ELSE regexp_replace(c.phone, '\D', '', 'g')
    END
    AND c.phone IS NOT NULL AND t.phone IS NOT NULL
  )
  LEFT JOIN chat_messages cm ON cm.client_id = c.id
  WHERE t.is_active = true
  GROUP BY t.id, c.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;