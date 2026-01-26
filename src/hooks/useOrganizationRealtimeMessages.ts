import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { playNotificationSound } from './useNotificationSound';
import { showBrowserNotification } from './useBrowserNotifications';

/** 
 * Realtime payload for chat_messages changes 
 * Supports both schemas:
 * - Self-hosted (message_type, message_text, is_outgoing)
 * - Lovable Cloud (direction, content)
 */
interface ChatMessagePayload {
  client_id: string | null;
  organization_id: string | null;
  // Lovable Cloud schema
  direction?: string | null;
  content?: string | null;
  // Self-hosted schema
  message_type?: string | null;
  message_text?: string | null;
  is_outgoing?: boolean | null;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'polling' | 'reconnecting';

// Polling interval when WebSocket is unavailable (5 seconds for faster updates)
const POLLING_INTERVAL = 5000;
// Hybrid polling interval - even when connected, poll periodically as backup
// OPTIMIZED: 30s → 60s to reduce DB load
const HYBRID_POLLING_INTERVAL = 60000;
// Time to wait before activating fallback polling after connection failure
const FALLBACK_DELAY = 2000;
// Interval for reconnection attempts (30 seconds)
const RECONNECT_INTERVAL = 30000;
// Max reconnection attempts before giving up temporarily
const MAX_RECONNECT_ATTEMPTS = 10;
// Timeout to detect WebSocket connection failure
const CONNECTION_TIMEOUT = 10000;

/** Helper to check if message is incoming based on both schemas */
const isIncomingMessage = (msg: ChatMessagePayload): boolean => {
  // Lovable Cloud schema
  if (msg.direction === 'incoming') return true;
  // Self-hosted schema
  if (msg.message_type === 'client') return true;
  if (msg.is_outgoing === false) return true;
  return false;
};

/** Helper to get message preview text from both schemas */
const getMessagePreview = (msg: ChatMessagePayload): string => {
  const text = msg.content || msg.message_text || 'Новое сообщение';
  return text.length > 50 ? text.substring(0, 50) + '...' : text;
};

/**
 * Optimized realtime hook that uses a SINGLE channel for all chat messages.
 * 
 * Features:
 * - Uses WebSocket realtime when available
 * - Falls back to polling when WebSocket fails
 * - Automatically reconnects when connection is restored
 * - Exposes connection status for UI indicators
 * 
 * Use at CRM page level, not in individual ChatArea components.
 */
export const useOrganizationRealtimeMessages = () => {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isSubscribedRef = useRef(false);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hybridPollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPollTimeRef = useRef<string | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isReconnectingRef = useRef(false);
  const lastRealtimeEventRef = useRef<number>(Date.now());
  
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  
  // Ref to hold handleConnectionFailure to avoid circular dependency
  const handleConnectionFailureRef = useRef<() => void>(() => {});

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
      // Select only fields that exist in self-hosted schema
      // Self-hosted uses: message_type, message_text, is_outgoing
      // Avoid: direction, content (these don't exist in self-hosted DB)
      const { data: newMessages, error } = await supabase
        .from('chat_messages')
        .select('id, client_id, message_type, message_text, created_at')
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

        // Check for incoming messages (self-hosted schema uses message_type='client')
        const incomingMessages = newMessages.filter(m => m.message_type === 'client');
        
        if (incomingMessages.length > 0) {
          playNotificationSound(0.5);
          
          const latestIncoming = incomingMessages[0];
          const messagePreview = latestIncoming.message_text || 'Новое сообщение';
          const truncatedPreview = messagePreview.length > 50 
            ? messagePreview.substring(0, 50) + '...' 
            : messagePreview;
          
          showBrowserNotification({
            title: 'Новое сообщение',
            body: truncatedPreview,
            tag: `chat-${latestIncoming.client_id || 'unknown'}`,
          });
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

  // Start hybrid polling (slower interval as backup even when WebSocket connected)
  const startHybridPolling = useCallback(() => {
    if (hybridPollingIntervalRef.current) return;
    
    console.log('[OrgRealtime] 🔄 Starting hybrid polling as backup (every', HYBRID_POLLING_INTERVAL / 1000, 's)');
    lastPollTimeRef.current = new Date().toISOString();
    
    hybridPollingIntervalRef.current = setInterval(() => {
      // Only poll if no realtime events received recently
      const timeSinceLastEvent = Date.now() - lastRealtimeEventRef.current;
      if (timeSinceLastEvent > HYBRID_POLLING_INTERVAL - 5000) {
        console.log('[OrgRealtime] 📥 Hybrid poll (no realtime events for', Math.round(timeSinceLastEvent / 1000), 's)');
        pollForMessages();
      }
    }, HYBRID_POLLING_INTERVAL);
  }, [pollForMessages]);

  // Stop hybrid polling
  const stopHybridPolling = useCallback(() => {
    if (hybridPollingIntervalRef.current) {
      clearInterval(hybridPollingIntervalRef.current);
      hybridPollingIntervalRef.current = null;
    }
  }, []);

  // Stop reconnection attempts
  const stopReconnecting = useCallback(() => {
    if (reconnectIntervalRef.current) {
      console.log('[OrgRealtime] ⏹️ Stopping reconnection attempts');
      clearInterval(reconnectIntervalRef.current);
      reconnectIntervalRef.current = null;
    }
    isReconnectingRef.current = false;
  }, []);

  // Create and subscribe to channel
  const createChannel = useCallback(() => {
    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    console.log('[OrgRealtime] 🔌 Creating channel...');
    
    // Set connection timeout
    const connectionTimeout = setTimeout(() => {
      if (!isSubscribedRef.current) {
        console.warn('[OrgRealtime] ⏱️ Connection timeout, switching to polling');
        handleConnectionFailureRef.current();
      }
    }, CONNECTION_TIMEOUT);

    const channel = supabase
      .channel('global_chat_messages_' + Date.now()) // Unique name to avoid conflicts
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
          
          // Track that we received a realtime event
          lastRealtimeEventRef.current = Date.now();
          
          console.log('[OrgRealtime] 📨 New message via realtime for client:', clientId);

          if (clientId) {
            invalidateClientMessageQueries(clientId);
          }

          // Use helper to check both schemas
          if (isIncomingMessage(newMsg)) {
            playNotificationSound(0.5);
            
            showBrowserNotification({
              title: 'Новое сообщение',
              body: getMessagePreview(newMsg),
              tag: `chat-${clientId || 'unknown'}`,
            });
            
            if (clientId) {
              queryClient.invalidateQueries({
                queryKey: ['client-unread-by-messenger', clientId],
              });
            }
          }

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
          
          if (clientId) {
            invalidateClientMessageQueries(clientId);
            queryClient.invalidateQueries({
              queryKey: ['client-unread-by-messenger', clientId],
            });
          }

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
          
          if (clientId) {
            invalidateClientMessageQueries(clientId);
          }

          invalidateThreadsQueries();
        }
      )
      .subscribe((status) => {
        console.log('[OrgRealtime] 📡 Channel status:', status);
        
        // Clear connection timeout on any status update
        clearTimeout(connectionTimeout);
        
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
          reconnectAttemptsRef.current = 0;
          setConnectionStatus('connected');
          stopPolling();
          stopReconnecting();
          // Start hybrid polling as backup for unreliable realtime (e.g., self-hosted)
          startHybridPolling();
          console.log('[OrgRealtime] ✅ Successfully subscribed to chat_messages realtime');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[OrgRealtime] ❌ Channel error');
          isSubscribedRef.current = false;
          handleConnectionFailureRef.current();
        } else if (status === 'TIMED_OUT') {
          console.error('[OrgRealtime] ⏱️ Channel timed out');
          isSubscribedRef.current = false;
          handleConnectionFailureRef.current();
        } else if (status === 'CLOSED') {
          console.warn('[OrgRealtime] 🔒 Channel closed');
          isSubscribedRef.current = false;
          // Don't trigger reconnect for intentional close
        }
      });

    channelRef.current = channel;
    return channel;
  }, [queryClient, invalidateClientMessageQueries, invalidateThreadsQueries, stopPolling, stopReconnecting, startHybridPolling]);

  // Handle connection failure - start polling and schedule reconnection
  const handleConnectionFailure = useCallback(() => {
    setConnectionStatus('disconnected');
    
    // Start polling fallback after delay
    if (!pollingIntervalRef.current) {
      fallbackTimeoutRef.current = setTimeout(startPolling, FALLBACK_DELAY);
    }
    
    // Start reconnection attempts if not already running
    if (!reconnectIntervalRef.current && !isReconnectingRef.current) {
      console.log('[OrgRealtime] 🔄 Scheduling reconnection attempts every', RECONNECT_INTERVAL / 1000, 's');
      
      reconnectIntervalRef.current = setInterval(() => {
        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          console.log('[OrgRealtime] ⚠️ Max reconnect attempts reached, will keep polling');
          stopReconnecting();
          return;
        }

        reconnectAttemptsRef.current++;
        console.log('[OrgRealtime] 🔄 Reconnection attempt', reconnectAttemptsRef.current, '/', MAX_RECONNECT_ATTEMPTS);
        setConnectionStatus('reconnecting');
        isReconnectingRef.current = true;
        
        // Try to create new channel
        createChannel();
      }, RECONNECT_INTERVAL);
    }
  }, [startPolling, stopReconnecting, createChannel]);

  // Keep the ref in sync with the latest handleConnectionFailure
  handleConnectionFailureRef.current = handleConnectionFailure;

  // Initial setup
  useEffect(() => {
    // Prevent duplicate subscriptions
    if (isSubscribedRef.current || channelRef.current) {
      console.log('[OrgRealtime] Already subscribed, skipping');
      return;
    }

    console.log('[OrgRealtime] 🔌 Setting up global chat messages channel...');
    createChannel();

    // Cleanup on unmount
    return () => {
      console.log('[OrgRealtime] 🔌 Cleaning up channel');
      isSubscribedRef.current = false;
      stopPolling();
      stopHybridPolling();
      stopReconnecting();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [createChannel, stopPolling, stopHybridPolling, stopReconnecting]);

  // Listen for online/offline events to trigger reconnection
  useEffect(() => {
    const handleOnline = () => {
      console.log('[OrgRealtime] 🌐 Browser is online, attempting reconnection...');
      if (!isSubscribedRef.current) {
        reconnectAttemptsRef.current = 0; // Reset attempts on network restore
        setConnectionStatus('reconnecting');
        createChannel();
      }
    };

    const handleOffline = () => {
      console.log('[OrgRealtime] 📴 Browser is offline');
      setConnectionStatus('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [createChannel]);

  // Listen for visibility change to reconnect when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isSubscribedRef.current) {
        console.log('[OrgRealtime] 👁️ Tab visible, checking connection...');
        // Give a small delay before attempting reconnection
        setTimeout(() => {
          if (!isSubscribedRef.current) {
            reconnectAttemptsRef.current = 0;
            setConnectionStatus('reconnecting');
            createChannel();
          }
        }, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [createChannel]);

  return { connectionStatus };
};

export default useOrganizationRealtimeMessages;
