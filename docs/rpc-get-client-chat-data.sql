-- ============================================================
-- RPC: get_client_chat_data
-- Unified function to load all chat dialog data in one query
-- Execute this on self-hosted Supabase (api.academyos.ru)
-- ============================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS get_client_chat_data(uuid, int);

CREATE OR REPLACE FUNCTION get_client_chat_data(
  p_client_id uuid,
  p_limit int DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_messages jsonb;
  v_has_more boolean;
  v_unread_counts jsonb;
  v_avatars jsonb;
  v_total_fetched int;
BEGIN
  -- 1. Fetch messages (limit + 1 to detect hasMore)
  WITH msg_data AS (
    SELECT 
      id,
      client_id,
      message_text,
      message_type,
      system_type,
      is_read,
      created_at,
      file_url,
      file_name,
      file_type,
      external_message_id,
      messenger_type,
      call_duration,
      message_status
    FROM chat_messages
    WHERE client_id = p_client_id
    ORDER BY created_at DESC
    LIMIT p_limit + 1
  )
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'client_id', client_id,
        'message_text', message_text,
        'message_type', message_type,
        'system_type', system_type,
        'is_read', is_read,
        'created_at', created_at,
        'file_url', file_url,
        'file_name', file_name,
        'file_type', file_type,
        'external_message_id', external_message_id,
        'messenger_type', messenger_type,
        'call_duration', call_duration,
        'message_status', message_status
      ) ORDER BY created_at ASC  -- Reverse to chronological order
    ),
    COUNT(*) > p_limit
  INTO v_messages, v_has_more
  FROM (
    SELECT * FROM msg_data
    ORDER BY created_at DESC
    LIMIT p_limit  -- Take only p_limit for actual data
  ) sub;

  -- Handle NULL case (no messages)
  IF v_messages IS NULL THEN
    v_messages := '[]'::jsonb;
    v_has_more := false;
  END IF;

  -- 2. Count unread messages by messenger type
  SELECT jsonb_object_agg(
    COALESCE(messenger_type, 'unknown'),
    cnt
  )
  INTO v_unread_counts
  FROM (
    SELECT 
      messenger_type,
      COUNT(*) as cnt
    FROM chat_messages
    WHERE client_id = p_client_id
      AND is_read = false
      AND message_type = 'client'
    GROUP BY messenger_type
  ) unread_data;

  -- Handle NULL case (no unread)
  IF v_unread_counts IS NULL THEN
    v_unread_counts := '{}'::jsonb;
  END IF;

  -- 3. Get client avatars
  SELECT jsonb_build_object(
    'whatsapp', whatsapp_avatar_url,
    'telegram', telegram_avatar_url,
    'max', max_avatar_url
  )
  INTO v_avatars
  FROM clients
  WHERE id = p_client_id;

  -- Handle NULL case (client not found)
  IF v_avatars IS NULL THEN
    v_avatars := '{"whatsapp": null, "telegram": null, "max": null}'::jsonb;
  END IF;

  -- 4. Return combined result
  RETURN jsonb_build_object(
    'messages', v_messages,
    'hasMore', v_has_more,
    'totalCount', jsonb_array_length(v_messages),
    'unreadCounts', v_unread_counts,
    'avatars', v_avatars
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_client_chat_data(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_client_chat_data(uuid, int) TO service_role;

-- ============================================================
-- USAGE EXAMPLE
-- ============================================================

-- SELECT get_client_chat_data('your-client-uuid'::uuid, 100);

-- Expected result:
-- {
--   "messages": [...],
--   "hasMore": false,
--   "totalCount": 42,
--   "unreadCounts": {"whatsapp": 3, "telegram": 1},
--   "avatars": {"whatsapp": "url1", "telegram": "url2", "max": null}
-- }

-- ============================================================
-- PERFORMANCE TEST
-- ============================================================

-- EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
-- SELECT get_client_chat_data('your-client-uuid'::uuid, 100);
