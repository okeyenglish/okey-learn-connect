import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { ChatThread, UnreadByMessenger } from './useChatMessages';
import { chatListQueryConfig } from '@/lib/queryConfig';
import { isGroupChatName, isTelegramGroup } from './useCommunityChats';
import { useMemo, useCallback, useEffect, useRef } from 'react';
import { useBulkAvatarFetch } from './useBulkAvatarFetch';

const PAGE_SIZE = 50;

// Флаги для отключения сломанных RPC (сбрасываются при перезагрузке страницы)
let useUnreadRpc = true;
let usePaginatedRpc = true;

interface RpcThreadRow {
  clt_id?: string;
  client_id?: string;
  client_name: string;
  first_name?: string | null;
  last_name?: string | null;
  middle_name?: string | null;
  client_phone?: string;
  client_branch?: string | null;
  avatar_url?: string | null;
  telegram_avatar_url?: string | null;
  whatsapp_avatar_url?: string | null;
  max_avatar_url?: string | null;
  telegram_chat_id?: string | null;
  whatsapp_chat_id?: string | null;
  max_chat_id?: string | null;
  last_message_text?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
  unread_whatsapp?: number;
  unread_telegram?: number;
  unread_max?: number;
  unread_email?: number;
  unread_calls?: number;
  last_unread_messenger?: string | null;
}

/**
 * Infinite scroll hook for chat threads
 * Loads 50 threads at a time for fast initial render
 * Automatically fetches more when scrolling
 */
export const useChatThreadsInfinite = () => {
  const queryClient = useQueryClient();
  const { checkAndFetchMissingAvatars } = useBulkAvatarFetch();

  // Query to get deleted client IDs (is_active = false)
  const { data: deletedClientIds = [] } = useQuery({
    queryKey: ['deleted-client-ids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id')
        .eq('is_active', false);
      
      if (error) {
        console.warn('[useChatThreadsInfinite] Error fetching deleted clients:', error.message);
        return [];
      }
      return (data || []).map(c => c.id);
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  // Infinite query for paginated threads (with fallback for missing RPC)
  const infiniteQuery = useInfiniteQuery({
    queryKey: ['chat-threads-infinite'],
    queryFn: async ({ pageParam = 0 }) => {
      // If RPC is broken, return empty immediately (rely on unreadQuery for data)
      if (!usePaginatedRpc) {
        console.log('[useChatThreadsInfinite] Paginated RPC disabled, returning empty');
        return { threads: [], hasMore: false, pageParam, executionTime: 0 };
      }

      const startTime = performance.now();
      console.log(`[useChatThreadsInfinite] Loading page ${pageParam}, offset ${pageParam * PAGE_SIZE}...`);

      const { data, error } = await supabase
        .rpc('get_chat_threads_paginated', { 
          p_limit: PAGE_SIZE + 1, // +1 to check if there are more
          p_offset: pageParam * PAGE_SIZE 
        });

      if (error) {
        // If function not found - disable RPC permanently for this session
        if (error.code === '42883' || error.code === 'PGRST202' || error.code === '42703') {
          console.warn('[useChatThreadsInfinite] Disabling broken paginated RPC:', error.code, error.message);
          usePaginatedRpc = false;
          return { threads: [], hasMore: false, pageParam, executionTime: 0 };
        }

        console.error('[useChatThreadsInfinite] RPC error:', error);
        // Fallback to basic query
        const { data: fallbackData, error: fallbackError } = await supabase
          .rpc('get_chat_threads_fast', { p_limit: PAGE_SIZE + 1 });
        
        if (fallbackError) {
          // If fallback also fails with schema error, disable
          if (fallbackError.code === '42883' || fallbackError.code === 'PGRST202') {
            console.warn('[useChatThreadsInfinite] Disabling broken fallback RPC');
            usePaginatedRpc = false;
            return { threads: [], hasMore: false, pageParam, executionTime: 0 };
          }
          throw fallbackError;
        }
        const fallbackArray = (fallbackData || []) as RpcThreadRow[];
        return {
          threads: mapRpcToThreads(fallbackArray.slice(0, PAGE_SIZE)),
          hasMore: fallbackArray.length > PAGE_SIZE,
          pageParam,
          executionTime: performance.now() - startTime
        };
      }

      const dataArray = (data || []) as RpcThreadRow[];
      const hasMore = dataArray.length > PAGE_SIZE;
      const threads = mapRpcToThreads(dataArray.slice(0, PAGE_SIZE));
      
      console.log(`[useChatThreadsInfinite] ✅ Page ${pageParam}: ${threads.length} threads in ${(performance.now() - startTime).toFixed(2)}ms`);
      
      return {
        threads,
        hasMore,
        pageParam,
        executionTime: performance.now() - startTime
      };
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.pageParam + 1;
    },
    initialPageParam: 0,
    retry: (failureCount, error: any) => {
      // Don't retry if function doesn't exist
      if (error?.code === '42883' || error?.code === 'PGRST202' || error?.code === '42703') return false;
      return failureCount < 1;
    },
    ...chatListQueryConfig,
  });

  // Track if we've already loaded once to prevent duplicate requests
  const hasLoadedOnce = useRef(false);

  // Separate fast query for unread threads (always shown at top)
  // With fallback mechanism for broken RPC
  const unreadQuery = useQuery({
    queryKey: ['chat-threads-unread-priority'],
    queryFn: async () => {
      // If RPC is broken, return empty immediately
      if (!useUnreadRpc) {
        console.log('[useChatThreadsInfinite] Unread RPC disabled, skipping');
        return [];
      }

      const startTime = performance.now();
      console.log('[useChatThreadsInfinite] Loading priority unread threads...');

      const { data, error } = await supabase
        .rpc('get_unread_chat_threads', { p_limit: 50 });

      if (error) {
        // If schema error (column doesn't exist or function not found) - disable RPC
        if (error.code === '42703' || error.code === 'PGRST202' || error.code === '42883') {
          console.warn('[useChatThreadsInfinite] Disabling broken unread RPC:', error.code, error.message);
          useUnreadRpc = false;
        } else {
          console.warn('[useChatThreadsInfinite] Unread RPC failed:', error.message);
        }
        return [];
      }

      hasLoadedOnce.current = true;
      const threads = mapRpcToThreads((data || []) as RpcThreadRow[]);
      console.log(`[useChatThreadsInfinite] ✅ Unread: ${threads.length} threads in ${(performance.now() - startTime).toFixed(2)}ms`);
      return threads;
    },
    staleTime: 30000, // 30 seconds (increased from 10)
    refetchOnWindowFocus: false,
    retry: false, // Don't retry schema errors
  });

  // Set of deleted client IDs for fast lookup
  const deletedIdsSet = useMemo(() => new Set(deletedClientIds), [deletedClientIds]);

  // Merge all threads: unread first, then paginated, filter out deleted
  // PRIORITY: Show unread data immediately even if paginated query is still loading
  const allThreads = useMemo(() => {
    const unreadThreads = unreadQuery.data || [];
    const paginatedPages = infiniteQuery.data?.pages || [];
    const paginatedThreads = paginatedPages.flatMap(page => page.threads);

    // If we have unread data but no paginated data yet, show unread immediately
    if (unreadThreads.length > 0 && paginatedThreads.length === 0) {
      return unreadThreads.filter(t => !deletedIdsSet.has(t.client_id));
    }

    // Create a map for deduplication
    const threadMap = new Map<string, ChatThread>();

    // Add unread threads first (they take priority), skip deleted
    unreadThreads.forEach(t => {
      if (!deletedIdsSet.has(t.client_id)) {
        threadMap.set(t.client_id, t);
      }
    });

    // Add paginated threads (skip if already exists from unread or deleted)
    paginatedThreads.forEach(t => {
      if (!threadMap.has(t.client_id) && !deletedIdsSet.has(t.client_id)) {
        threadMap.set(t.client_id, t);
      }
    });

    // Convert to array and sort
    const merged = Array.from(threadMap.values());
    
    // Sort: unread first, then by last_message_time
    merged.sort((a, b) => {
      const aHasUnread = a.unread_count > 0 ? 0 : 1;
      const bHasUnread = b.unread_count > 0 ? 0 : 1;
      if (aHasUnread !== bHasUnread) return aHasUnread - bHasUnread;
      
      const aTime = new Date(a.last_message_time || 0).getTime();
      const bTime = new Date(b.last_message_time || 0).getTime();
      return bTime - aTime;
    });

    return merged;
  }, [unreadQuery.data, infiniteQuery.data?.pages, deletedIdsSet]);

  // Trigger background avatar fetch for clients without avatars
  useEffect(() => {
    if (allThreads.length > 0) {
      // Convert to format expected by checkAndFetchMissingAvatars
      const threadsForCheck = allThreads.map(t => ({
        client_id: t.client_id,
        whatsapp_avatar_url: t.whatsapp_avatar_url,
        telegram_avatar_url: t.telegram_avatar_url,
        max_avatar_url: t.max_avatar_url,
        avatar_url: t.avatar_url,
      }));
      checkAndFetchMissingAvatars(threadsForCheck);
    }
  }, [allThreads, checkAndFetchMissingAvatars]);

  // Load more function for infinite scroll
  const loadMore = useCallback(() => {
    if (infiniteQuery.hasNextPage && !infiniteQuery.isFetchingNextPage) {
      infiniteQuery.fetchNextPage();
    }
  }, [infiniteQuery]);

  // Refetch all data
  const refetch = useCallback(async () => {
    await Promise.all([
      unreadQuery.refetch(),
      infiniteQuery.refetch()
    ]);
  }, [unreadQuery, infiniteQuery]);

  // Show data as soon as EITHER query has data (don't block on both)
  const hasInitialData = (unreadQuery.data && unreadQuery.data.length > 0) || 
                         (infiniteQuery.data?.pages && infiniteQuery.data.pages.length > 0);

  return {
    data: allThreads,
    // Only show loading if we have NO data at all
    isLoading: !hasInitialData && (infiniteQuery.isLoading || unreadQuery.isLoading),
    isFetching: infiniteQuery.isFetching || unreadQuery.isFetching,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    hasNextPage: infiniteQuery.hasNextPage,
    loadMore,
    refetch,
    error: infiniteQuery.error || unreadQuery.error,
  };
};

// Helper to check if message is a system/internal message that shouldn't be shown in preview
function isSystemPreviewMessage(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return (
    lower.includes('crm_system_state_changed') ||
    lower.includes('задача "') ||
    lower.includes('задача создана') ||
    lower.includes('задача выполнена') ||
    lower.includes('задача отменена') ||
    lower.startsWith('задача "')
  );
}

// Helper function to map RPC result to ChatThread format
function mapRpcToThreads(data: RpcThreadRow[]): ChatThread[] {
  // Filter out group chats and system chats
  const filteredData = data.filter((row) => {
    const name = row.client_name || '';
    const telegramChatId = row.telegram_chat_id;
    
    // Check for real Telegram groups (negative telegram_chat_id starting with -100)
    if (telegramChatId) {
      const chatIdStr = String(telegramChatId);
      if (isTelegramGroup(chatIdStr)) {
        return false;
      }
    }
    
    // Exclude group chats by name patterns
    if (isGroupChatName(name)) {
      return false;
    }
    
    // Exclude system chats by name patterns
    const lowerName = name.toLowerCase();
    if (lowerName.includes('корпоративный') || 
        lowerName.includes('педагог') || 
        lowerName.includes('преподаватель:')) {
      return false;
    }
    
    return true;
  });

  return filteredData.map((row) => {
    // Get raw last message
    const rawLastMessage = row.last_message_text || row.last_message || '';
    
    // Filter out system messages from preview - show empty instead
    const lastMessage = isSystemPreviewMessage(rawLastMessage) ? '' : rawLastMessage;
    
    return {
      client_id: row.clt_id || row.client_id || '',
      client_name: row.client_name || '',
      first_name: row.first_name || null,
      last_name: row.last_name || null,
      middle_name: row.middle_name || null,
      client_phone: row.client_phone || '',
      client_branch: row.client_branch || null,
      avatar_url: row.avatar_url || null,
      telegram_avatar_url: row.telegram_avatar_url || null,
      whatsapp_avatar_url: row.whatsapp_avatar_url || null,
      max_avatar_url: row.max_avatar_url || null,
      telegram_chat_id: row.telegram_chat_id || null,
      whatsapp_chat_id: row.whatsapp_chat_id || null,
      max_chat_id: row.max_chat_id || null,
      last_message: lastMessage,
      last_message_time: row.last_message_time,
      last_message_messenger: row.last_unread_messenger || null,
      unread_count: Number(row.unread_count) || 0,
      unread_by_messenger: {
        whatsapp: Number(row.unread_whatsapp) || 0,
        telegram: Number(row.unread_telegram) || 0,
        max: Number(row.unread_max) || 0,
        email: Number(row.unread_email) || 0,
        calls: Number(row.unread_calls) || 0,
      } as UnreadByMessenger,
      last_unread_messenger: row.last_unread_messenger || null,
      messages: []
    };
  });
}

export default useChatThreadsInfinite;
