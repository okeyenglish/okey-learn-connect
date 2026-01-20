-- Optimize get_teacher_unread_counts: reduce regex operations and use simpler matching
-- The current function is too slow due to multiple regex operations on every row

DROP FUNCTION IF EXISTS public.get_teacher_unread_counts();

CREATE OR REPLACE FUNCTION public.get_teacher_unread_counts()
RETURNS TABLE (
  teacher_id UUID,
  client_id UUID,
  unread_count BIGINT,
  last_message_time TIMESTAMPTZ,
  last_message_text TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- Pre-normalize teacher phones once
  teacher_phones AS (
    SELECT 
      t.id AS tid,
      regexp_replace(t.phone, '\D', '', 'g') AS phone_digits
    FROM teachers t
    WHERE t.is_active = true 
      AND t.phone IS NOT NULL 
      AND t.phone != ''
  ),
  -- Find matching clients using whatsapp_chat_id (most common case)
  matched_clients AS (
    SELECT DISTINCT ON (tp.tid)
      tp.tid,
      c.id AS cid
    FROM teacher_phones tp
    JOIN clients c ON c.whatsapp_chat_id IS NOT NULL
      AND regexp_replace(c.whatsapp_chat_id, '@.*$', '') = tp.phone_digits
    ORDER BY tp.tid, c.id
  ),
  -- Get last message info for matched clients
  client_stats AS (
    SELECT 
      mc.tid,
      mc.cid,
      (
        SELECT COUNT(*) 
        FROM chat_messages cm 
        WHERE cm.client_id = mc.cid 
          AND cm.is_read = false 
          AND cm.is_outgoing = false
      ) AS unread_cnt,
      (
        SELECT cm.created_at 
        FROM chat_messages cm 
        WHERE cm.client_id = mc.cid 
        ORDER BY cm.created_at DESC 
        LIMIT 1
      ) AS last_time,
      (
        SELECT cm.message_text 
        FROM chat_messages cm 
        WHERE cm.client_id = mc.cid 
        ORDER BY cm.created_at DESC 
        LIMIT 1
      ) AS last_text
    FROM matched_clients mc
  )
  SELECT 
    t.id AS teacher_id,
    cs.cid AS client_id,
    COALESCE(cs.unread_cnt, 0)::BIGINT AS unread_count,
    cs.last_time AS last_message_time,
    cs.last_text AS last_message_text
  FROM teachers t
  LEFT JOIN client_stats cs ON cs.tid = t.id
  WHERE t.is_active = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_teacher_unread_counts() TO authenticated;

-- Create index for faster whatsapp_chat_id matching
CREATE INDEX IF NOT EXISTS idx_clients_whatsapp_chat_id_prefix 
ON clients (regexp_replace(whatsapp_chat_id, '@.*$', ''))
WHERE whatsapp_chat_id IS NOT NULL;