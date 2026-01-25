import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { playNotificationSound } from './useNotificationSound';
import { showBrowserNotification } from './useBrowserNotifications';

/** Realtime payload for chat_messages changes - matches actual DB schema */
interface ChatMessagePayload {
  client_id: string | null;
  is_outgoing?: boolean;
  content?: string | null;
  message_type?: string | null;
}

/**
 * Optimized realtime hook that uses a SINGLE channel for all chat messages.
 * 
 * Note: chat_messages table doesn't have organization_id column,
 * so we subscribe to all changes and rely on RLS for filtering.
 * 
 * This reduces WebSocket connections from N (number of open chats) to 1.
 * 
 * Use at CRM page level, not in individual ChatArea components.
 */
export const useOrganizationRealtimeMessages = () => {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    // We don't need organizationId since chat_messages doesn't have this column
    // RLS handles the filtering on the server side
    console.log('[useOrganizationRealtimeMessages] Setting up global chat messages channel');

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

    // Create a single channel for all chat messages (RLS filters by user's org)
    const channel = supabase
      .channel('global_chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          const newMsg = payload.new as ChatMessagePayload;
          const clientId = newMsg.client_id;
          
          console.log('[OrgRealtime] New message for client:', clientId);

          // Invalidate messages caches for this specific client (all implementations)
          if (clientId) {
            invalidateClientMessageQueries(clientId);
          }

          // If it's an incoming client message, play notification sound
          // Uses 'is_outgoing' field from schema (false = from client)
          const isIncoming = newMsg.is_outgoing === false;
          
          if (isIncoming) {
            playNotificationSound(0.5);
            
            // Show browser notification when tab is inactive
            const messagePreview = newMsg.content 
              ? (newMsg.content.length > 50 ? newMsg.content.substring(0, 50) + '...' : newMsg.content)
              : 'Новое сообщение';
            
            showBrowserNotification({
              title: 'Новое сообщение',
              body: messagePreview,
              tag: `chat-${clientId || 'unknown'}`, // Prevent duplicate notifications for same client
              onClick: () => {
                // Focus will happen automatically, but we could navigate to specific chat here
              },
            });
            
            if (clientId) {
              queryClient.invalidateQueries({
                queryKey: ['client-unread-by-messenger', clientId],
              });
            }
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
          table: 'chat_messages'
        },
        (payload) => {
          const updatedMsg = payload.new as ChatMessagePayload;
          const clientId = updatedMsg.client_id;
          
          console.log('[OrgRealtime] Message updated for client:', clientId);
          
          // Invalidate messages caches for this specific client
          if (clientId) {
            invalidateClientMessageQueries(clientId);

            // Update unread counts (message might have been marked as read)
            queryClient.invalidateQueries({
              queryKey: ['client-unread-by-messenger', clientId],
            });
          }

          // Message update can also affect last message preview / ordering
          invalidateThreadsQueries();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          const deletedMsg = payload.old as ChatMessagePayload;
          const clientId = deletedMsg.client_id;
          
          console.log('[OrgRealtime] Message deleted for client:', clientId);
          
          // Invalidate messages caches for this specific client
          if (clientId) {
            invalidateClientMessageQueries(clientId);
          }

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
  }, [queryClient]);

  return null;
};

export default useOrganizationRealtimeMessages;
