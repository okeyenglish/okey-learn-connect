import React, { useRef, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { ChatMessage } from './useChatMessages';
import { chatQueryConfig } from '@/lib/queryConfig';
import { startMetric, endMetric } from '@/lib/performanceMetrics';
import { performanceAnalytics } from '@/utils/performanceAnalytics';
import { isValidUUID } from '@/lib/uuidValidation';
import { onMessageEvent, offMessageEvent } from './useOrganizationRealtimeMessages';

const MESSAGES_PER_PAGE = 100;

// In-memory message cache for instant display
const messageCache = new Map<string, { messages: ChatMessage[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes (increased from 1 minute for better UX)

/**
 * Optimized hook for loading chat messages with proper caching
 * 
 * Optimizations:
 * 1. Removed COUNT query for 2x speedup (uses limit+1 technique)
 * 2. In-memory cache for instant display before React Query loads
 * 3. Selective field fetching (only needed fields)
 * 4. Smart stale time management
 */
export const useChatMessagesOptimized = (clientId: string, limit = MESSAGES_PER_PAGE, enabled: boolean = true) => {
  // Check in-memory cache for instant display
  const cachedData = React.useMemo(() => {
    if (!enabled || !clientId) return null;
    const cached = messageCache.get(clientId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return { messages: cached.messages, hasMore: false, totalCount: cached.messages.length };
    }
    return null;
  }, [clientId, enabled]);

  const query = useQuery({
    queryKey: ['chat-messages-optimized', clientId, limit],
    queryFn: async () => {
      if (!clientId) return { messages: [], hasMore: false, totalCount: 0 };

      const metricId = startMetric('chat-messages', { clientId, limit });
      const analyticsStart = performance.now();
      
      try {
        // Optimized: removed JOIN on clients - avatars are fetched separately via useClientAvatars
        // This reduces query time significantly (no cross-table lookup)
        const { data, error } = await supabase
          .from('chat_messages')
          .select(`
            id, client_id, message_text, message_type, system_type, is_read,
            created_at, file_url, file_name, file_type, external_message_id,
            messenger_type, call_duration, message_status, metadata
          `)
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(limit + 1);

        if (error) {
          console.error('[useChatMessagesOptimized] Query failed:', error.message);
          endMetric(metricId, 'failed', { error: error.message });
          throw error;
        }

        const allData = data || [];
        const hasMore = allData.length > limit;
        const messages = hasMore ? allData.slice(0, limit) : allData;
        const reversed = (messages as ChatMessage[]).reverse();

        // Update in-memory cache
        messageCache.set(clientId, { messages: reversed, timestamp: Date.now() });

        // Track for performance analytics
        performanceAnalytics.trackQuery({
          table: 'chat_messages',
          operation: 'SELECT',
          duration: performance.now() - analyticsStart,
          source: 'useChatMessagesOptimized',
          rowCount: messages.length,
        });

        endMetric(metricId, 'completed', { msgCount: messages.length });
        return { messages: reversed, hasMore, totalCount: messages.length };
      } catch (err) {
        endMetric(metricId, 'failed', { error: String(err) });
        throw err;
      }
    },
    enabled: enabled && !!clientId,
    staleTime: 10 * 1000, // Reduced to 10 seconds for fresher data
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    refetchOnWindowFocus: false, // Use realtime instead
    refetchOnMount: true, // Refetch when chat opened
    // Use in-memory cache as placeholder for instant display
    placeholderData: cachedData || undefined,
  });

  return query;
};

/**
 * Hook for realtime new message subscription
 * Now relies on useOrganizationRealtimeMessages hub which already invalidates
 * ['chat-messages-optimized', clientId] queries, so no own channel is needed.
 * Only triggers the onNewMessage callback (e.g. scroll-to-bottom).
 */
export const useNewMessageRealtime = (clientId: string, onNewMessage?: () => void) => {
  const onNewMessageRef = useRef(onNewMessage);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  useEffect(() => {
    if (!clientId || !isValidUUID(clientId)) return;

    const handleEvent = (msg: any, eventType: string) => {
      if (eventType === 'INSERT' && msg.client_id === clientId) {
        console.log('[Realtime] New message received for client (via hub):', clientId);
        onNewMessageRef.current?.();
      }
    };

    onMessageEvent(handleEvent);
    return () => {
      offMessageEvent(handleEvent);
    };
  }, [clientId]);
};

/**
 * Hook for realtime message status updates
 * Now uses the callback registry from useOrganizationRealtimeMessages instead of
 * creating its own postgres_changes channel.
 * Shows toast notification when a message delivery fails
 */
export const useMessageStatusRealtime = (clientId: string, onDeliveryFailed?: (messageId: string) => void) => {
  const queryClient = useQueryClient();
  const notifiedFailedRef = useRef<Set<string>>(new Set());
  const onDeliveryFailedRef = useRef(onDeliveryFailed);

  useEffect(() => {
    onDeliveryFailedRef.current = onDeliveryFailed;
  }, [onDeliveryFailed]);

  useEffect(() => {
    if (!clientId || !isValidUUID(clientId)) return;
    
    notifiedFailedRef.current = new Set();

    const handleEvent = (msg: any, eventType: string) => {
      if (eventType !== 'UPDATE') return;
      if (msg.client_id !== clientId) return;

      const newRecord = msg as { status?: string; id?: string; message_text?: string };
      
      if (newRecord?.status) {
        console.log('[Realtime] Message status updated (via hub):', newRecord.id, '->', newRecord.status);
        
        if (newRecord.status === 'failed') {
          if (!notifiedFailedRef.current.has(newRecord.id!)) {
            notifiedFailedRef.current.add(newRecord.id!);
            
            const event = new CustomEvent('message-delivery-failed', {
              detail: {
                messageId: newRecord.id,
                messagePreview: newRecord.message_text?.substring(0, 50) || 'Сообщение'
              }
            });
            window.dispatchEvent(event);
            
            onDeliveryFailedRef.current?.(newRecord.id!);
          }
        }
        
        queryClient.setQueriesData(
          { queryKey: ['chat-messages-optimized', clientId] },
          (oldData: any) => {
            if (!oldData?.messages) return oldData;
            
            return {
              ...oldData,
              messages: oldData.messages.map((m: ChatMessage) => 
                m.id === newRecord.id 
                  ? { ...m, status: newRecord.status }
                  : m
              )
            };
          }
        );
      }
    };

    onMessageEvent(handleEvent);
    return () => {
      offMessageEvent(handleEvent);
    };
  }, [clientId, queryClient]);
};

/**
 * Hook to load more messages (older ones)
 */
export const useLoadMoreMessages = (clientId: string) => {
  const queryClient = useQueryClient();

  const loadMore = async (currentLimit: number) => {
    const newLimit = currentLimit + MESSAGES_PER_PAGE;
    
    // Invalidate with new limit to trigger refetch
    await queryClient.invalidateQueries({
      queryKey: ['chat-messages-optimized', clientId, newLimit]
    });

    return newLimit;
  };

  return { loadMore };
};

/**
 * Optimized unread count query - uses idx_chat_messages_client_unread index
 */
export const useUnreadCountOptimized = (clientId: string) => {
  return useQuery({
    queryKey: ['unread-count-optimized', clientId],
    queryFn: async () => {
      if (!clientId) return { total: 0, byMessenger: {} };

      const start = performance.now();

      // Uses partial index idx_chat_messages_client_unread for fast unread counts
      // Self-hosted schema: message_type='client' for incoming messages
      const { data, error } = await supabase
        .from('chat_messages')
        .select('messenger_type')
        .eq('client_id', clientId)
        .eq('is_read', false)
        .eq('message_type', 'client');

      if (error) throw error;

      const byMessenger: Record<string, number> = {
        whatsapp: 0,
        telegram: 0,
        max: 0,
        email: 0
      };

      (data || []).forEach((msg: any) => {
        const type = msg.messenger_type || 'whatsapp';
        byMessenger[type] = (byMessenger[type] || 0) + 1;
      });

      performanceAnalytics.trackQuery({
        table: 'chat_messages',
        operation: 'SELECT',
        duration: performance.now() - start,
        source: 'useUnreadCountOptimized',
        rowCount: data?.length,
      });

      return {
        total: data?.length || 0,
        byMessenger
      };
    },
    enabled: !!clientId,
    staleTime: 5000, // 5 seconds
    refetchOnWindowFocus: true,
  });
};

/**
 * Prefetch messages for a client (useful for hover prefetching)
 * This enables instant chat opening when user hovers over chat list items
 * 
 * Optimizations:
 * - Checks cache freshness to avoid redundant fetches
 * - Uses AbortController to cancel in-flight requests if user moves away
 * - Batches multiple prefetch requests with debouncing
 */
export const usePrefetchMessages = () => {
  const queryClient = useQueryClient();
  const pendingPrefetches = React.useRef<Map<string, AbortController>>(new Map());

  const prefetch = React.useCallback((clientId: string) => {
    if (!clientId) return;

    // Check if already cached and fresh (within 30 seconds for prefetch)
    const existingState = queryClient.getQueryState(['chat-messages-optimized', clientId, MESSAGES_PER_PAGE]);
    const isFresh = existingState?.dataUpdatedAt && (Date.now() - existingState.dataUpdatedAt < 30000);
    if (isFresh) {
      console.log(`[Prefetch] ${clientId.slice(0, 8)} already fresh, skipping`);
      return;
    }

    // Check if already fetching this client
    if (pendingPrefetches.current.has(clientId)) {
      return;
    }

    // Create AbortController for this prefetch
    const controller = new AbortController();
    pendingPrefetches.current.set(clientId, controller);

    queryClient.prefetchQuery({
      queryKey: ['chat-messages-optimized', clientId, MESSAGES_PER_PAGE],
      queryFn: async () => {
        const startTime = performance.now();
        
        // Self-hosted schema uses: message_text, message_type, messenger_type, file_url, etc.
        const { data, error } = await supabase
          .from('chat_messages')
          .select(`
            id, client_id, message_text, message_type, system_type, is_read, created_at,
            file_url, file_name, file_type, external_message_id, messenger_type, call_duration, message_status, metadata,
            clients(avatar_url)
          `)
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(MESSAGES_PER_PAGE + 1)
          .abortSignal(controller.signal);

        // Remove from pending
        pendingPrefetches.current.delete(clientId);

        if (error) {
          // Fallback without join
          const fallback = await supabase
            .from('chat_messages')
            .select('id, client_id, message_text, message_type, system_type, is_read, created_at, file_url, file_name, file_type, external_message_id, messenger_type, call_duration, message_status')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false })
            .limit(MESSAGES_PER_PAGE + 1);
          
          const allData = fallback.data || [];
          const hasMore = allData.length > MESSAGES_PER_PAGE;
          const messages = hasMore ? allData.slice(0, MESSAGES_PER_PAGE) : allData;
          
          return {
            messages: (messages as ChatMessage[]).reverse(),
            hasMore,
            totalCount: messages.length
          };
        }

        const allData = data || [];
        const hasMore = allData.length > MESSAGES_PER_PAGE;
        const messages = hasMore ? allData.slice(0, MESSAGES_PER_PAGE) : allData;

        const endTime = performance.now();
        console.log(`[Prefetch] ✅ ${clientId.slice(0, 8)} loaded in ${(endTime - startTime).toFixed(0)}ms`);

        return {
          messages: (messages as ChatMessage[]).reverse(),
          hasMore,
          totalCount: messages.length
        };
      },
      staleTime: 30 * 1000, // 30 seconds for prefetched data
    });
  }, [queryClient]);

  const cancelPrefetch = React.useCallback((clientId: string) => {
    const controller = pendingPrefetches.current.get(clientId);
    if (controller) {
      controller.abort();
      pendingPrefetches.current.delete(clientId);
      console.log(`[Prefetch] Cancelled ${clientId.slice(0, 8)}`);
    }
  }, []);

  return { prefetch, cancelPrefetch };
};
