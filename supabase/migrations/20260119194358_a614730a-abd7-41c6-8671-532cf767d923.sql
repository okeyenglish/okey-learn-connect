-- Add first_name, last_name, middle_name columns to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS middle_name TEXT;

-- Create function to parse existing full name into components
-- Format expected: "Фамилия Имя Отчество" or "Фамилия Имя"
CREATE OR REPLACE FUNCTION public.parse_client_name(full_name TEXT)
RETURNS TABLE(last_name TEXT, first_name TEXT, middle_name TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  parts TEXT[];
BEGIN
  -- Split by spaces
  parts := string_to_array(trim(full_name), ' ');
  
  -- Return based on number of parts
  CASE array_length(parts, 1)
    WHEN 1 THEN
      -- Just one word - could be first or last name, treat as first
      RETURN QUERY SELECT NULL::TEXT, parts[1], NULL::TEXT;
    WHEN 2 THEN
      -- Two words: Last First
      RETURN QUERY SELECT parts[1], parts[2], NULL::TEXT;
    WHEN 3 THEN
      -- Three words: Last First Middle
      RETURN QUERY SELECT parts[1], parts[2], parts[3];
    ELSE
      -- More than 3 words: first is last, second is first, rest is middle
      IF array_length(parts, 1) > 3 THEN
        RETURN QUERY SELECT parts[1], parts[2], array_to_string(parts[3:], ' ');
      ELSE
        RETURN QUERY SELECT NULL::TEXT, full_name, NULL::TEXT;
      END IF;
  END CASE;
END;
$$;

-- Migrate existing data: parse 'name' field into first_name, last_name, middle_name
UPDATE public.clients 
SET 
  last_name = parsed.last_name,
  first_name = parsed.first_name,
  middle_name = parsed.middle_name
FROM (
  SELECT c.id, p.last_name, p.first_name, p.middle_name
  FROM public.clients c
  CROSS JOIN LATERAL public.parse_client_name(c.name) p
  WHERE c.name IS NOT NULL 
    AND c.name != ''
    AND c.name != 'Без имени'
    AND c.first_name IS NULL
) AS parsed
WHERE clients.id = parsed.id;

-- Create index for faster name searches
CREATE INDEX IF NOT EXISTS idx_clients_last_name ON public.clients(last_name);
CREATE INDEX IF NOT EXISTS idx_clients_first_name ON public.clients(first_name);

-- Update RPC functions to return new name fields
DROP FUNCTION IF EXISTS public.get_chat_threads_optimized_v2(UUID, INT, INT);
CREATE OR REPLACE FUNCTION public.get_chat_threads_optimized_v2(
  p_organization_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  client_id UUID,
  client_name TEXT,
  first_name TEXT,
  last_name TEXT,
  middle_name TEXT,
  client_phone TEXT,
  avatar_url TEXT,
  last_message_text TEXT,
  last_message_time TIMESTAMPTZ,
  last_message_is_outgoing BOOLEAN,
  unread_count BIGINT,
  whatsapp_unread BIGINT,
  telegram_unread BIGINT,
  max_unread BIGINT,
  salebot_unread BIGINT,
  is_pinned BOOLEAN,
  is_archived BOOLEAN,
  whatsapp_chat_id TEXT,
  telegram_chat_id TEXT,
  max_chat_id TEXT,
  telegram_avatar_url TEXT,
  whatsapp_avatar_url TEXT,
  max_avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH latest_messages AS (
    SELECT DISTINCT ON (cm.client_id)
      cm.client_id,
      cm.message_text,
      cm.created_at,
      cm.is_outgoing
    FROM public.chat_messages cm
    WHERE cm.organization_id = p_organization_id
    ORDER BY cm.client_id, cm.created_at DESC
  ),
  unread_counts AS (
    SELECT 
      cm.client_id,
      COUNT(*) FILTER (WHERE NOT cm.is_read) as total_unread,
      COUNT(*) FILTER (WHERE NOT cm.is_read AND cm.messenger_type = 'whatsapp') as wa_unread,
      COUNT(*) FILTER (WHERE NOT cm.is_read AND cm.messenger_type = 'telegram') as tg_unread,
      COUNT(*) FILTER (WHERE NOT cm.is_read AND cm.messenger_type = 'max') as max_unread,
      COUNT(*) FILTER (WHERE NOT cm.is_read AND cm.messenger_type = 'salebot') as sb_unread
    FROM public.chat_messages cm
    WHERE cm.organization_id = p_organization_id
      AND cm.is_outgoing = false
    GROUP BY cm.client_id
  )
  SELECT 
    c.id as client_id,
    c.name as client_name,
    c.first_name,
    c.last_name,
    c.middle_name,
    c.phone as client_phone,
    COALESCE(c.avatar_url, c.whatsapp_avatar_url, c.telegram_avatar_url, c.max_avatar_url) as avatar_url,
    lm.message_text as last_message_text,
    lm.created_at as last_message_time,
    lm.is_outgoing as last_message_is_outgoing,
    COALESCE(uc.total_unread, 0) as unread_count,
    COALESCE(uc.wa_unread, 0) as whatsapp_unread,
    COALESCE(uc.tg_unread, 0) as telegram_unread,
    COALESCE(uc.max_unread, 0) as max_unread,
    COALESCE(uc.sb_unread, 0) as salebot_unread,
    COALESCE(cs.is_pinned, false) as is_pinned,
    COALESCE(cs.is_archived, false) as is_archived,
    c.whatsapp_chat_id,
    c.telegram_chat_id,
    c.max_chat_id,
    c.telegram_avatar_url,
    c.whatsapp_avatar_url,
    c.max_avatar_url
  FROM public.clients c
  LEFT JOIN latest_messages lm ON lm.client_id = c.id
  LEFT JOIN unread_counts uc ON uc.client_id = c.id
  LEFT JOIN public.chat_states cs ON cs.chat_id = c.id::text AND cs.user_id = auth.uid()
  WHERE c.organization_id = p_organization_id
    AND c.is_active = true
    AND lm.message_text IS NOT NULL
    AND COALESCE(cs.is_archived, false) = false
  ORDER BY 
    COALESCE(cs.is_pinned, false) DESC,
    lm.created_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;