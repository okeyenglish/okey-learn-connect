-- =====================================================
-- OPTIMIZATION: get_chat_threads_by_client_ids RPC
-- Run this on self-hosted Supabase (api.academyos.ru)
-- =====================================================

-- Step 1: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_client_id_created_desc 
ON public.chat_messages (client_id, created_at DESC);

-- Note: idx_chat_messages_client_unread_partial already exists with:
-- WHERE (is_read = false) AND (message_type = 'client')
-- RPC must use the same condition to leverage this index

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
    COALESCE(to_jsonb(c)->>'name', to_jsonb(c)->>'client_name') as client_name,
    to_jsonb(c)->>'first_name' as first_name,
    to_jsonb(c)->>'last_name' as last_name,
    to_jsonb(c)->>'middle_name' as middle_name,
    to_jsonb(c)->>'phone' as phone,
    to_jsonb(c)->>'email' as email,
    COALESCE(
      to_jsonb(c)->>'whatsapp_id',
      to_jsonb(c)->>'whatsapp_chat_id',
      to_jsonb(c)->>'whatsapp_chat',
      to_jsonb(c)->>'whatsapp'
    ) as whatsapp_id,
    COALESCE(
      to_jsonb(c)->>'telegram_user_id',
      to_jsonb(c)->>'telegram_chat_id',
      to_jsonb(c)->>'telegram_chat'
    ) as telegram_user_id,
    to_jsonb(c)->>'salebot_client_id' as salebot_client_id,
    COALESCE(to_jsonb(c)->>'branch', to_jsonb(c)->>'branch_name') as branch,
    CASE WHEN COALESCE((to_jsonb(c)->>'is_active')::boolean, true) THEN 'active' ELSE 'inactive' END as status,
    lm.message_text as last_message_content,
    lm.created_at as last_message_at,
    lm.messenger_type as last_messenger,
    COALESCE(unread.total, 0) as unread_count,
    COALESCE(unread.whatsapp, 0) as unread_whatsapp,
    COALESCE(unread.telegram, 0) as unread_telegram,
    COALESCE(unread.max_count, 0) as unread_max,
    COALESCE(unread.salebot, 0) as unread_salebot,
    COALESCE(
      to_jsonb(c)->>'avatar_url',
      to_jsonb(c)->>'whatsapp_avatar_url',
      to_jsonb(c)->>'telegram_avatar_url',
      to_jsonb(c)->>'max_avatar_url'
    ) as avatar_url
  FROM unnest(p_client_ids) AS cid(id)
  JOIN public.clients c ON c.id = cid.id
  -- Get last message using LATERAL (much faster than correlated subquery)
  LEFT JOIN LATERAL (
    SELECT 
      COALESCE(to_jsonb(cm)->>'message_text', to_jsonb(cm)->>'content') as message_text,
      cm.created_at,
      COALESCE(to_jsonb(cm)->>'messenger_type', to_jsonb(cm)->>'messenger') as messenger_type
    FROM public.chat_messages cm
    WHERE cm.client_id = c.id
    ORDER BY cm.created_at DESC
    LIMIT 1
  ) lm ON true
  -- Get unread counts using LATERAL with single scan
  LEFT JOIN LATERAL (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (
        WHERE COALESCE(to_jsonb(chat_messages)->>'messenger_type', to_jsonb(chat_messages)->>'messenger') = 'whatsapp'
      ) as whatsapp,
      COUNT(*) FILTER (
        WHERE COALESCE(to_jsonb(chat_messages)->>'messenger_type', to_jsonb(chat_messages)->>'messenger') = 'telegram'
      ) as telegram,
      COUNT(*) FILTER (
        WHERE COALESCE(to_jsonb(chat_messages)->>'messenger_type', to_jsonb(chat_messages)->>'messenger') = 'max'
      ) as max_count,
      COUNT(*) FILTER (
        WHERE COALESCE(to_jsonb(chat_messages)->>'messenger_type', to_jsonb(chat_messages)->>'messenger') = 'salebot'
      ) as salebot
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
