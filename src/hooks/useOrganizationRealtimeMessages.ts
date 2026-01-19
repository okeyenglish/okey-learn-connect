import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';

/**
 * Optimized realtime hook that uses a SINGLE channel for all chat messages
 * filtered by organization_id instead of creating a channel per client.
 * 
 * This reduces WebSocket connections from N (number of open chats) to 1.
 * 
 * Use at CRM page level, not in individual ChatArea components.
 */
export const useOrganizationRealtimeMessages = () => {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const organizationId = organization?.id;

  useEffect(() => {
    if (!organizationId) return;

    console.log('[useOrganizationRealtimeMessages] Setting up organization-wide channel:', organizationId);

    const invalidateClientMessageQueries = (clientId: string) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', clientId] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages-infinite', clientId] });
      queryClient.invalidateQueries({
        queryKey: ['chat-messages-optimized', clientId],
        exact: false,
      });
    };

    const invalidateThreadsQueries = () => {
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads-unread-priority'] });
      queryClient.invalidateQueries({ queryKey: ['unread-client-ids'] });
    };

    // Create a single channel for all chat messages in the organization
    const channel = supabase
      .channel(`org_chat_messages_${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          const newMsg = payload.new as any;
          const clientId = newMsg.client_id;
          
          console.log('[OrgRealtime] New message for client:', clientId);

          // Invalidate messages caches for this specific client (all implementations)
          invalidateClientMessageQueries(clientId);

          // If it's a client message, update unread counts
          if (newMsg.message_type === 'client' || !newMsg.is_outgoing) {
            queryClient.invalidateQueries({
              queryKey: ['client-unread-by-messenger', clientId],
            });
          }

          // Always update chat threads lists for new messages
          invalidateThreadsQueries();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          const updatedMsg = payload.new as any;
          const clientId = updatedMsg.client_id;
          
          console.log('[OrgRealtime] Message updated for client:', clientId);
          
          // Invalidate messages caches for this specific client
          invalidateClientMessageQueries(clientId);

          // Update unread counts (message might have been marked as read)
          queryClient.invalidateQueries({
            queryKey: ['client-unread-by-messenger', clientId],
          });

          // Message update can also affect last message preview / ordering
          invalidateThreadsQueries();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          const deletedMsg = payload.old as any;
          const clientId = deletedMsg.client_id;
          
          console.log('[OrgRealtime] Message deleted for client:', clientId);
          
          // Invalidate messages caches for this specific client
          invalidateClientMessageQueries(clientId);

          // Update chat threads lists (delete can change last message)
          invalidateThreadsQueries();
        }
      )
      .subscribe((status) => {
        console.log('[OrgRealtime] Channel status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('[useOrganizationRealtimeMessages] Cleaning up channel');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [organizationId, queryClient]);

  return null;
};

export default useOrganizationRealtimeMessages;
