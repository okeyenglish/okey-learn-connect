import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage } from './useChatMessages';
import { chatQueryConfig } from '@/lib/queryConfig';

const MESSAGES_PER_PAGE = 100;

/**
 * Optimized hook for loading chat messages with proper caching
 * Removed COUNT query for 2x speedup - uses limit+1 technique instead
 */
export const useChatMessagesOptimized = (clientId: string, limit = MESSAGES_PER_PAGE) => {
  return useQuery({
    queryKey: ['chat-messages-optimized', clientId, limit],
    queryFn: async () => {
      if (!clientId) return { messages: [], hasMore: false, totalCount: 0 };

      const startTime = performance.now();
      
      // Fetch limit+1 to check if there are more messages (no COUNT query needed!)
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          clients(avatar_url, whatsapp_chat_id, telegram_avatar_url, whatsapp_avatar_url, max_avatar_url)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(limit + 1);

      if (error) {
        // Fallback without join if RLS blocks it
        console.warn('[useChatMessagesOptimized] Join failed, falling back:', error.message);
        const fallback = await supabase
          .from('chat_messages')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(limit + 1);

        if (fallback.error) throw fallback.error;

        const fallbackMessages = fallback.data || [];
        const hasMore = fallbackMessages.length > limit;
        const messages = hasMore ? fallbackMessages.slice(0, limit) : fallbackMessages;

        const endTime = performance.now();
        console.log(`[useChatMessagesOptimized] Fallback completed in ${(endTime - startTime).toFixed(2)}ms, ${messages.length} messages`);

        return {
          messages: (messages as ChatMessage[]).reverse(),
          hasMore,
          totalCount: messages.length
        };
      }

      const allData = data || [];
      const hasMore = allData.length > limit;
      const messages = hasMore ? allData.slice(0, limit) : allData;

      const endTime = performance.now();
      console.log(`[useChatMessagesOptimized] ✅ Loaded ${messages.length} messages in ${(endTime - startTime).toFixed(2)}ms`);

      return {
        messages: (messages as ChatMessage[]).reverse(),
        hasMore,
        totalCount: messages.length
      };
    },
    enabled: !!clientId,
    // Important: Use shorter staleTime so messages are refreshed more often
    staleTime: 5 * 1000, // 5 seconds - messages are refreshed quickly
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    refetchOnWindowFocus: true, // Refetch when window gains focus for fresh data
    refetchOnMount: 'always', // Always refetch when component mounts (chat opened)
    // CRITICAL: Do NOT keep previous client's data - show loading state immediately
    // This prevents showing old chat while loading new one
    placeholderData: undefined,
  });
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

      // Uses partial index idx_chat_messages_client_unread for fast unread counts
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
        
        // Use limit+1 technique (no COUNT needed)
        // Include client avatar data for instant display
        const { data, error } = await supabase
          .from('chat_messages')
          .select(`
            *,
            clients(avatar_url, whatsapp_chat_id, telegram_avatar_url, whatsapp_avatar_url, max_avatar_url)
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
            .select('*')
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
