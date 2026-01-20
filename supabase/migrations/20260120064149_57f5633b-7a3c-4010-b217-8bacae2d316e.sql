-- Further optimize: use single subquery per client instead of 3 correlated subqueries
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
  -- Pre-normalize teacher phones once (only digits)
  teacher_phones AS (
    SELECT 
      t.id AS tid,
      regexp_replace(t.phone, '\D', '', 'g') AS phone_digits
    FROM teachers t
    WHERE t.is_active = true 
      AND t.phone IS NOT NULL 
      AND t.phone != ''
  ),
  -- Find matching clients by whatsapp_chat_id prefix
  matched AS (
    SELECT DISTINCT ON (tp.tid)
      tp.tid,
      c.id AS cid
    FROM teacher_phones tp
    JOIN clients c ON c.whatsapp_chat_id IS NOT NULL
      AND regexp_replace(c.whatsapp_chat_id, '@.*$', '') = tp.phone_digits
    ORDER BY tp.tid, c.id
  ),
  -- Get all stats in one pass using window functions
  msg_stats AS (
    SELECT 
      m.tid,
      m.cid,
      COUNT(*) FILTER (WHERE cm.is_read = false AND cm.is_outgoing = false) AS unread_cnt,
      MAX(cm.created_at) AS last_time
    FROM matched m
    LEFT JOIN chat_messages cm ON cm.client_id = m.cid
    GROUP BY m.tid, m.cid
  ),
  -- Get last message text separately (more efficient than window function)
  last_msgs AS (
    SELECT DISTINCT ON (m.cid)
      m.cid,
      cm.message_text
    FROM matched m
    JOIN chat_messages cm ON cm.client_id = m.cid
    ORDER BY m.cid, cm.created_at DESC
  )
  SELECT 
    t.id AS teacher_id,
    ms.cid AS client_id,
    COALESCE(ms.unread_cnt, 0)::BIGINT AS unread_count,
    ms.last_time AS last_message_time,
    lm.message_text AS last_message_text
  FROM teachers t
  LEFT JOIN msg_stats ms ON ms.tid = t.id
  LEFT JOIN last_msgs lm ON lm.cid = ms.cid
  WHERE t.is_active = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_teacher_unread_counts() TO authenticated;