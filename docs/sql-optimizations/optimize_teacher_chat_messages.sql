-- ============================================================
-- OPTIMIZATION: get_teacher_chat_messages RPC
-- Execute this on self-hosted Supabase (api.academyos.ru)
-- ============================================================

-- Step 1: Create optimized indexes for chat_messages table
-- These indexes will significantly speed up the query

-- Index for client_id + created_at (most important for this RPC)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_messages_client_id_created_at 
ON chat_messages (client_id, created_at DESC);

-- Partial index for unread messages (helps with unread counts)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_messages_unread 
ON chat_messages (client_id, created_at DESC) 
WHERE is_read = false;

-- Index for messenger_type filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_messages_client_messenger 
ON chat_messages (client_id, messenger_type, created_at DESC);


-- Step 2: Create a lightweight security check function
-- This avoids calling the heavy get_teacher_unread_counts()
CREATE OR REPLACE FUNCTION is_teacher_linked_to_client(p_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Fast check: does a link exist between current user's teacher record and the client?
  SELECT EXISTS (
    SELECT 1 
    FROM teacher_client_links tcl
    JOIN teachers t ON t.id = tcl.teacher_id
    WHERE tcl.client_id = p_client_id
      AND t.profile_id = auth.uid()
      AND t.is_active = true
  )
$$;


-- Step 3: Create optimized RPC with LIMIT parameter
CREATE OR REPLACE FUNCTION get_teacher_chat_messages(
  p_client_id uuid,
  p_limit int DEFAULT 200
)
RETURNS TABLE (
  id uuid,
  client_id uuid,
  phone_number_id uuid,
  message_text text,
  message_type text,
  system_type text,
  is_read boolean,
  is_outgoing boolean,
  call_duration text,
  created_at timestamptz,
  file_url text,
  file_name text,
  file_type text,
  external_message_id text,
  messenger_type text,
  message_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Fast security check using optimized function
  IF NOT is_teacher_linked_to_client(p_client_id) THEN
    RETURN;
  END IF;

  -- Return messages with LIMIT for performance
  RETURN QUERY
  SELECT 
    cm.id,
    cm.client_id,
    cm.phone_number_id,
    cm.message_text,
    cm.message_type,
    cm.system_type,
    cm.is_read,
    cm.is_outgoing,
    cm.call_duration,
    cm.created_at,
    cm.file_url,
    cm.file_name,
    cm.file_type,
    cm.external_message_id,
    cm.messenger_type::text,
    cm.message_status::text
  FROM chat_messages cm
  WHERE cm.client_id = p_client_id
  ORDER BY cm.created_at DESC  -- DESC for latest first, then reverse in app
  LIMIT p_limit;
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION get_teacher_chat_messages(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION is_teacher_linked_to_client(uuid) TO authenticated;


-- Step 4: Analyze tables after index creation
ANALYZE chat_messages;
ANALYZE teacher_client_links;


-- ============================================================
-- VERIFICATION: Run these queries to check performance
-- ============================================================

-- Check if indexes exist
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'chat_messages';

-- Explain query plan (should use index scan, not seq scan)
-- EXPLAIN ANALYZE SELECT * FROM chat_messages 
-- WHERE client_id = 'YOUR_CLIENT_ID' ORDER BY created_at DESC LIMIT 200;

-- Test the optimized RPC
-- SELECT * FROM get_teacher_chat_messages('YOUR_CLIENT_ID', 200);
