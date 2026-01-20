-- Update get_teacher_unread_counts to include last_messenger_type for auto-switching tabs
DROP FUNCTION IF EXISTS public.get_teacher_unread_counts();

CREATE OR REPLACE FUNCTION public.get_teacher_unread_counts()
RETURNS TABLE (
  teacher_id UUID,
  client_id UUID,
  unread_count BIGINT,
  last_message_time TIMESTAMPTZ,
  last_message_text TEXT,
  last_messenger_type TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH teacher_clients AS (
    SELECT 
      t.id AS tid,
      tcl.client_id AS cid
    FROM teachers t
    LEFT JOIN teacher_client_links tcl ON tcl.teacher_id = t.id
    WHERE t.is_active = true
  ),
  unread_counts AS (
    SELECT 
      tc.cid,
      COUNT(*) AS cnt
    FROM teacher_clients tc
    JOIN chat_messages cm ON cm.client_id = tc.cid
      AND cm.is_read = false
      AND cm.is_outgoing = false
    WHERE tc.cid IS NOT NULL
    GROUP BY tc.cid
  ),
  last_messages AS (
    SELECT DISTINCT ON (tc.cid)
      tc.cid,
      cm.created_at,
      cm.message_text,
      cm.messenger_type
    FROM teacher_clients tc
    JOIN chat_messages cm ON cm.client_id = tc.cid
    WHERE tc.cid IS NOT NULL
    ORDER BY tc.cid, cm.created_at DESC
  )
  SELECT 
    tc.tid AS teacher_id,
    tc.cid AS client_id,
    COALESCE(uc.cnt, 0)::BIGINT AS unread_count,
    lm.created_at AS last_message_time,
    lm.message_text AS last_message_text,
    lm.messenger_type::TEXT AS last_messenger_type
  FROM teacher_clients tc
  LEFT JOIN unread_counts uc ON uc.cid = tc.cid
  LEFT JOIN last_messages lm ON lm.cid = tc.cid;
$$;

GRANT EXECUTE ON FUNCTION public.get_teacher_unread_counts() TO authenticated;