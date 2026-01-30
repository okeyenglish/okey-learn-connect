-- Migration: Add RPC functions for importing only clients without message history
-- Apply to: self-hosted Supabase (api.academyos.ru)
-- Purpose: Enable "Import New Only" mode that skips clients who already have imported messages
--
-- These functions are used by import-salebot-chats-auto Edge Function in sync_new_clients_only mode

-- ============================================================================
-- Drop existing functions first (to allow signature changes)
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_clients_without_imported_messages(UUID, INT, INT);
DROP FUNCTION IF EXISTS public.count_clients_without_imported_messages(UUID);

-- ============================================================================
-- Function: get_clients_without_imported_messages
-- Returns clients that have salebot_client_id but NO messages with salebot_message_id
-- Now also returns salebot_client_type for correct messenger mapping
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_clients_without_imported_messages(
  p_org_id UUID,
  p_offset INT DEFAULT 0,
  p_limit INT DEFAULT 20
)
RETURNS TABLE(
  id UUID, 
  name TEXT, 
  salebot_client_id BIGINT,
  salebot_client_type INTEGER
) 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id, 
    c.name, 
    c.salebot_client_id::BIGINT,
    c.salebot_client_type
  FROM clients c
  WHERE c.organization_id = p_org_id
    AND c.salebot_client_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM chat_messages m 
      WHERE m.client_id = c.id 
        AND m.salebot_message_id IS NOT NULL
    )
  ORDER BY c.created_at
  OFFSET p_offset
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.get_clients_without_imported_messages IS 
'Returns clients that have salebot_client_id but no imported messages (salebot_message_id). Used for "Import New Only" mode.';

-- ============================================================================
-- Function: count_clients_without_imported_messages
-- Counts clients for UI display in SyncDashboard
-- ============================================================================
CREATE OR REPLACE FUNCTION public.count_clients_without_imported_messages(p_org_id UUID)
RETURNS INT
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INT
  FROM clients c
  WHERE c.organization_id = p_org_id
    AND c.salebot_client_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM chat_messages m 
      WHERE m.client_id = c.id 
        AND m.salebot_message_id IS NOT NULL
    );
$$;

COMMENT ON FUNCTION public.count_clients_without_imported_messages IS 
'Counts clients without imported messages for UI display in SyncDashboard.';

-- ============================================================================
-- Grant permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.get_clients_without_imported_messages TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_clients_without_imported_messages TO service_role;
GRANT EXECUTE ON FUNCTION public.count_clients_without_imported_messages TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_clients_without_imported_messages TO service_role;
