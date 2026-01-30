-- =====================================================
-- OPTIMIZATION: get_chat_threads_by_client_ids RPC
-- Run this on self-hosted Supabase (api.academyos.ru)
-- =====================================================

-- Step 1: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_client_id_created_desc 
ON public.chat_messages (client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_client_unread_partial 
ON public.chat_messages (client_id, messenger_type) 
WHERE is_read = false AND message_type = 'client';

CREATE INDEX IF NOT EXISTS idx_clients_id_active 
ON public.clients (id) 
WHERE is_active = true;

-- Step 2: Optimized RPC function using LATERAL joins
CREATE OR REPLACE FUNCTION public.get_chat_threads_by_client_ids(p_client_ids uuid[])
RETURNS TABLE (
  client_id uuid,
  client_name text,
  first_name text,
  last_name text,
  middle_name text,
  phone text,
  email text,
  whatsapp_id text,
  telegram_user_id text,
  salebot_client_id text,
  branch text,
  status text,
  last_message_content text,
  last_message_at timestamptz,
  last_messenger text,
  unread_count bigint,
  unread_whatsapp bigint,
  unread_telegram bigint,
  unread_max bigint,
  unread_salebot bigint,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id as client_id,
    c.name as client_name,
    c.first_name,
    c.last_name,
    c.middle_name,
    c.phone,
    c.email,
    c.whatsapp_id,
    c.telegram_user_id,
    c.salebot_client_id,
    c.branch,
    CASE WHEN c.is_active THEN 'active' ELSE 'inactive' END as status,
    lm.message_text as last_message_content,
    lm.created_at as last_message_at,
    lm.messenger_type as last_messenger,
    COALESCE(unread.total, 0) as unread_count,
    COALESCE(unread.whatsapp, 0) as unread_whatsapp,
    COALESCE(unread.telegram, 0) as unread_telegram,
    COALESCE(unread.max_count, 0) as unread_max,
    COALESCE(unread.salebot, 0) as unread_salebot,
    c.avatar_url
  FROM unnest(p_client_ids) AS cid(id)
  JOIN public.clients c ON c.id = cid.id
  -- Get last message using LATERAL (much faster than correlated subquery)
  LEFT JOIN LATERAL (
    SELECT cm.message_text, cm.created_at, cm.messenger_type
    FROM public.chat_messages cm
    WHERE cm.client_id = c.id
    ORDER BY cm.created_at DESC
    LIMIT 1
  ) lm ON true
  -- Get unread counts using LATERAL with single scan
  LEFT JOIN LATERAL (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE messenger_type = 'whatsapp') as whatsapp,
      COUNT(*) FILTER (WHERE messenger_type = 'telegram') as telegram,
      COUNT(*) FILTER (WHERE messenger_type = 'max') as max_count,
      COUNT(*) FILTER (WHERE messenger_type = 'salebot') as salebot
    FROM public.chat_messages
    WHERE client_id = c.id 
      AND is_read = false 
      AND message_type = 'client'
  ) unread ON true
$$;

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION public.get_chat_threads_by_client_ids(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_chat_threads_by_client_ids(uuid[]) TO service_role;

-- Step 4: Add documentation
COMMENT ON FUNCTION public.get_chat_threads_by_client_ids IS 
  'Optimized function to fetch chat threads for multiple clients using LATERAL joins';

-- Verify indexes were created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'chat_messages' 
  AND indexname LIKE 'idx_chat_messages%';
