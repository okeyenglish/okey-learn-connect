import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { playNotificationSound } from './useNotificationSound';
import { showBrowserNotification } from './useBrowserNotifications';

/** Realtime payload for chat_messages changes - matches actual DB schema */
interface ChatMessagePayload {
  client_id: string | null;
  organization_id: string | null;
  direction?: string | null; // 'incoming' or 'outgoing'
  content?: string | null;
  message_type?: string | null;
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'polling';

// Polling interval when WebSocket is unavailable (10 seconds)
const POLLING_INTERVAL = 10000;
// Time to wait before activating fallback polling after connection failure
const FALLBACK_DELAY = 5000;

/**
 * Optimized realtime hook that uses a SINGLE channel for all chat messages.
 * 
 * Features:
 * - Uses WebSocket realtime when available
 * - Falls back to polling when WebSocket fails
 * - Exposes connection status for UI indicators
 * 
 * Use at CRM page level, not in individual ChatArea components.
 */
export const useOrganizationRealtimeMessages = () => {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isSubscribedRef = useRef(false);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPollTimeRef = useRef<string | null>(null);
  
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');

  // Invalidation helpers
  const invalidateClientMessageQueries = useCallback((clientId: string) => {
    queryClient.invalidateQueries({ queryKey: ['chat-messages', clientId] });
    queryClient.invalidateQueries({ queryKey: ['chat-messages-infinite', clientId] });
    queryClient.invalidateQueries({
      queryKey: ['chat-messages-optimized', clientId],
      exact: false,
    });
  }, [queryClient]);

  const invalidateThreadsQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
    queryClient.invalidateQueries({ queryKey: ['chat-threads-infinite'] });
    queryClient.invalidateQueries({ queryKey: ['chat-threads-unread-priority'] });
    queryClient.invalidateQueries({ queryKey: ['unread-client-ids'] });
  }, [queryClient]);

  // Polling fallback - fetches recent messages since last poll
  const pollForMessages = useCallback(async () => {
    const since = lastPollTimeRef.current || new Date(Date.now() - POLLING_INTERVAL * 2).toISOString();
    
    try {
      const { data: newMessages, error } = await supabase
        .from('chat_messages')
        .select('id, client_id, direction, content, created_at')
        .gt('created_at', since)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[OrgRealtime] Polling error:', error);
        return;
      }

      if (newMessages && newMessages.length > 0) {
        console.log('[OrgRealtime] 📥 Polled', newMessages.length, 'new messages');
        
        // Get unique client IDs
        const clientIds = [...new Set(newMessages.map(m => m.client_id).filter(Boolean))];
        
        // Invalidate queries for affected clients
        clientIds.forEach(clientId => {
          if (clientId) {
            invalidateClientMessageQueries(clientId);
            queryClient.invalidateQueries({
              queryKey: ['client-unread-by-messenger', clientId],
            });
          }
        });

        // Check for incoming messages to play sound
        const hasIncoming = newMessages.some(m => m.direction === 'incoming');
        if (hasIncoming) {
          playNotificationSound(0.5);
          
          const latestIncoming = newMessages.find(m => m.direction === 'incoming');
          if (latestIncoming) {
            const messagePreview = latestIncoming.content 
              ? (latestIncoming.content.length > 50 ? latestIncoming.content.substring(0, 50) + '...' : latestIncoming.content)
              : 'Новое сообщение';
            
            showBrowserNotification({
              title: 'Новое сообщение',
              body: messagePreview,
              tag: `chat-${latestIncoming.client_id || 'unknown'}`,
            });
          }
        }

        // Always update threads
        invalidateThreadsQueries();
      }

      // Update last poll time
      lastPollTimeRef.current = new Date().toISOString();
    } catch (err) {
      console.error('[OrgRealtime] Polling exception:', err);
    }
  }, [queryClient, invalidateClientMessageQueries, invalidateThreadsQueries]);

  // Start polling fallback
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;
    
    console.log('[OrgRealtime] 🔄 Starting fallback polling (every', POLLING_INTERVAL / 1000, 's)');
    setConnectionStatus('polling');
    lastPollTimeRef.current = new Date().toISOString();
    
    // Poll immediately
    pollForMessages();
    
    // Then poll at interval
    pollingIntervalRef.current = setInterval(pollForMessages, POLLING_INTERVAL);
  }, [pollForMessages]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      console.log('[OrgRealtime] ⏹️ Stopping fallback polling');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Prevent duplicate subscriptions
    if (isSubscribedRef.current || channelRef.current) {
      console.log('[OrgRealtime] Already subscribed, skipping');
      return;
    }

    console.log('[OrgRealtime] 🔌 Setting up global chat messages channel...');

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
          const isIncoming = newMsg.direction === 'incoming';
          
          if (isIncoming) {
            playNotificationSound(0.5);
            
            // Show browser notification when tab is inactive
            const messagePreview = newMsg.content 
              ? (newMsg.content.length > 50 ? newMsg.content.substring(0, 50) + '...' : newMsg.content)
              : 'Новое сообщение';
            
            showBrowserNotification({
              title: 'Новое сообщение',
              body: messagePreview,
              tag: `chat-${clientId || 'unknown'}`,
              onClick: () => {
                // Focus will happen automatically
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
        console.log('[OrgRealtime] 📡 Channel status:', status);
        
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
          setConnectionStatus('connected');
          stopPolling(); // Stop polling if websocket connects
          console.log('[OrgRealtime] ✅ Successfully subscribed to chat_messages realtime');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[OrgRealtime] ❌ Channel error - activating fallback polling');
          isSubscribedRef.current = false;
          setConnectionStatus('disconnected');
          
          // Activate polling fallback after delay
          fallbackTimeoutRef.current = setTimeout(startPolling, FALLBACK_DELAY);
        } else if (status === 'TIMED_OUT') {
          console.error('[OrgRealtime] ⏱️ Channel timed out - activating fallback polling');
          isSubscribedRef.current = false;
          setConnectionStatus('disconnected');
          
          // Activate polling fallback after delay
          fallbackTimeoutRef.current = setTimeout(startPolling, FALLBACK_DELAY);
        } else if (status === 'CLOSED') {
          console.warn('[OrgRealtime] 🔒 Channel closed');
          isSubscribedRef.current = false;
          setConnectionStatus('disconnected');
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('[OrgRealtime] 🔌 Cleaning up channel');
      isSubscribedRef.current = false;
      stopPolling();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [queryClient, invalidateClientMessageQueries, invalidateThreadsQueries, startPolling, stopPolling]);

  return { connectionStatus };
};

export default useOrganizationRealtimeMessages;
