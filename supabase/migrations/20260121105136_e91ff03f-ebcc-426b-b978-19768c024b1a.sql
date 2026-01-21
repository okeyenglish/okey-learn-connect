
-- Fix refresh_teacher_client_links to support all messengers (WhatsApp, Telegram, and plain phone)
-- The current function only matches WhatsApp, missing teachers who only have Telegram

CREATE OR REPLACE FUNCTION refresh_teacher_client_links()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clear and repopulate for a clean refresh
  DELETE FROM teacher_client_links;
  
  -- Insert links matching by multiple methods with priority scoring
  INSERT INTO teacher_client_links (teacher_id, client_id)
  SELECT DISTINCT ON (t.id) 
    t.id,
    c.id
  FROM teachers t
  CROSS JOIN LATERAL (
    -- Normalize teacher phone: remove all non-digits
    SELECT regexp_replace(t.phone, '\D', '', 'g') AS normalized_phone
  ) tp
  JOIN clients c ON (
    -- Match by WhatsApp chat_id (most reliable)
    (c.whatsapp_chat_id IS NOT NULL AND regexp_replace(c.whatsapp_chat_id, '@.*$', '') = tp.normalized_phone)
    OR
    -- Match by Telegram: check if normalized client phone matches
    (c.telegram_chat_id IS NOT NULL AND regexp_replace(c.phone, '\D', '', 'g') = tp.normalized_phone)
    OR
    -- Match by plain phone (fallback)
    (c.phone IS NOT NULL AND regexp_replace(c.phone, '\D', '', 'g') = tp.normalized_phone)
  )
  WHERE t.is_active = true 
    AND t.phone IS NOT NULL 
    AND t.phone != ''
    AND tp.normalized_phone != ''
  ORDER BY t.id, 
    -- Priority: prefer clients with messages
    (SELECT COUNT(*) FROM chat_messages cm WHERE cm.client_id = c.id) DESC,
    -- Then prefer clients with recent activity
    c.last_message_at DESC NULLS LAST,
    -- Then prefer those with WhatsApp
    (c.whatsapp_chat_id IS NOT NULL) DESC,
    -- Then prefer those with Telegram
    (c.telegram_chat_id IS NOT NULL) DESC
  ON CONFLICT (teacher_id) DO UPDATE SET 
    client_id = EXCLUDED.client_id,
    updated_at = now();
END;
$$;

-- Run the refresh to populate missing links
SELECT refresh_teacher_client_links();
