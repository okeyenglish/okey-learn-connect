-- Create helper table to cache teacher-client links (much faster than regex matching every time)
CREATE TABLE IF NOT EXISTS teacher_client_links (
  teacher_id UUID PRIMARY KEY REFERENCES teachers(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE teacher_client_links ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Authenticated can read teacher_client_links" ON teacher_client_links
  FOR SELECT TO authenticated USING (true);

-- Populate the cache table from existing data
INSERT INTO teacher_client_links (teacher_id, client_id)
SELECT DISTINCT ON (t.id)
  t.id,
  c.id
FROM teachers t
JOIN clients c ON c.whatsapp_chat_id IS NOT NULL
  AND regexp_replace(c.whatsapp_chat_id, '@.*$', '') = regexp_replace(t.phone, '\D', '', 'g')
WHERE t.is_active = true 
  AND t.phone IS NOT NULL 
  AND t.phone != ''
ON CONFLICT (teacher_id) DO UPDATE SET 
  client_id = EXCLUDED.client_id,
  updated_at = now();

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_teacher_client_links_client ON teacher_client_links(client_id);

-- Super-optimized function using cache table
DROP FUNCTION IF EXISTS public.get_teacher_unread_counts();

CREATE OR REPLACE FUNCTION public.get_teacher_unread_counts()
RETURNS TABLE (
  teacher_id UUID,
  client_id UUID,
  unread_count BIGINT,
  last_message_time TIMESTAMPTZ,
  last_message_text TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
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
      cm.message_text
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
    lm.message_text AS last_message_text
  FROM teacher_clients tc
  LEFT JOIN unread_counts uc ON uc.cid = tc.cid
  LEFT JOIN last_messages lm ON lm.cid = tc.cid;
$$;

GRANT EXECUTE ON FUNCTION public.get_teacher_unread_counts() TO authenticated;

-- Create function to refresh cache (call when new teachers/clients added)
CREATE OR REPLACE FUNCTION refresh_teacher_client_links()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO teacher_client_links (teacher_id, client_id)
  SELECT DISTINCT ON (t.id)
    t.id,
    c.id
  FROM teachers t
  JOIN clients c ON c.whatsapp_chat_id IS NOT NULL
    AND regexp_replace(c.whatsapp_chat_id, '@.*$', '') = regexp_replace(t.phone, '\D', '', 'g')
  WHERE t.is_active = true 
    AND t.phone IS NOT NULL 
    AND t.phone != ''
  ON CONFLICT (teacher_id) DO UPDATE SET 
    client_id = EXCLUDED.client_id,
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION refresh_teacher_client_links() TO authenticated;