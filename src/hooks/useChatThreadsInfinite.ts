import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { ChatThread, UnreadByMessenger } from './useChatMessages';
import { chatListQueryConfig } from '@/lib/queryConfig';
import { isGroupChatName, isTelegramGroup } from './useCommunityChats';
import { useMemo, useCallback, useEffect } from 'react';
import { useBulkAvatarFetch } from './useBulkAvatarFetch';

const PAGE_SIZE = 50;

// Флаг для отключения сломанной RPC (сбрасывается при перезагрузке страницы)
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
  last_messenger_type?: string | null;
  unread_count?: number;
  unread_whatsapp?: number;
  unread_telegram?: number;
  unread_max?: number;
  unread_email?: number;
  unread_calls?: number;
  last_unread_messenger?: string | null;
}

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
    lower.startsWith('задача "') ||
    lower.includes('отметил(а): ответ не требуется') ||
    lower.includes('подтвердил(а) оплату')
  );
}

/**
 * Direct SQL fallback for fetching chat threads when RPC is unavailable
 * This bypasses the RPC and fetches data directly from tables
 */
async function fetchThreadsDirectly(limit: number, offset: number, unreadOnly: boolean = false, allowedBranches?: string[]): Promise<ChatThread[]> {
  console.log(`[fetchThreadsDirectly] Fetching ${unreadOnly ? 'unread' : 'all'} threads, limit=${limit}, offset=${offset}, branches=${allowedBranches ? allowedBranches.join(',') : 'all'}`);
  const startTime = performance.now();

  // 1. Fetch clients ordered by last_message_at (most recent activity first)
  let clientsQuery = supabase
    .from('clients')
    .select('id, name, first_name, last_name, phone, branch, avatar_url, telegram_user_id, has_pending_payment')
    .eq('is_active', true)
    .not('last_message_at', 'is', null)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  // Apply branch filter server-side (fail-open: include clients with NULL branch)
  if (allowedBranches && allowedBranches.length > 0) {
    clientsQuery = clientsQuery.or(`branch.in.(${allowedBranches.join(',')}),branch.is.null`);
  }

  const { data: clients, error: clientsError } = await clientsQuery;

  if (clientsError) {
    console.error('[fetchThreadsDirectly] Failed to fetch clients:', clientsError);
    return [];
  }

  if (!clients || clients.length === 0) {
    console.log('[fetchThreadsDirectly] No clients found');
    return [];
  }

  const clientIds = clients.map(c => c.id);
  console.log(`[fetchThreadsDirectly] Fetched ${clientIds.length} clients`);

   // 2. Fetch last messages for these clients (self-hosted schema uses message_text, is_outgoing, messenger_type)
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('client_id, message_text, created_at, is_read, messenger_type, message_type, is_outgoing, status')
      .in('client_id', clientIds)
      .order('created_at', { ascending: false })
      .limit(clientIds.length * 10);

  if (messagesError) {
    console.error('[fetchThreadsDirectly] Failed to fetch messages:', messagesError);
  }

  // 3. Group messages by client
  const messagesByClient = new Map<string, any[]>();
  (messages || []).forEach((msg: any) => {
    if (!messagesByClient.has(msg.client_id)) {
      messagesByClient.set(msg.client_id, []);
    }
    messagesByClient.get(msg.client_id)!.push(msg);
  });

  // 4. Build threads
  const threads: ChatThread[] = clients
    .filter((client: any) => {
      // Filter out group chats
      if (isGroupChatName(client.name || '')) return false;
      
      // Filter out system chats
      const lowerName = (client.name || '').toLowerCase();
      if (lowerName.includes('корпоративный') || 
          lowerName.includes('педагог') || 
          lowerName.includes('преподаватель:')) {
        return false;
      }
      
      return true;
    })
    .map((client: any) => {
      const clientMessages = messagesByClient.get(client.id) || [];
      const lastMessage = clientMessages[0];
      // Self-hosted uses is_outgoing boolean for message direction
      // Only count incoming client messages as unread (exclude system, comment, manager types)
      const unreadMessages = clientMessages.filter((m: any) => 
        !m.is_read && !m.is_outgoing && m.message_type === 'client'
      );

      // Get message text (self-hosted uses message_text)
      const rawLastMessageText = lastMessage?.message_text || '';
      const lastMessageText = isSystemPreviewMessage(rawLastMessageText) ? '' : rawLastMessageText;

      const unreadByMessenger: UnreadByMessenger = {
        whatsapp: 0,
        telegram: 0,
        max: 0,
        chatos: 0,
        email: 0,
        calls: 0,
      };
      
      unreadMessages.forEach((m: any) => {
        const type = m.messenger_type as keyof UnreadByMessenger;
        // Skip 'calls' as it's not a valid messenger enum value in the database
        if (type && type !== 'calls' && type in unreadByMessenger) {
          unreadByMessenger[type]++;
        }
      });

      return {
        client_id: client.id,
        client_name: client.name || '',
        first_name: client.first_name || null,
        last_name: client.last_name || null,
        client_phone: client.phone || '',
        client_branch: client.branch || null,
        avatar_url: client.avatar_url || null,
        telegram_avatar_url: null,
        whatsapp_avatar_url: null,
        max_avatar_url: null,
        telegram_chat_id: null,
        whatsapp_chat_id: null,
        max_chat_id: null,
        last_message: lastMessageText,
        last_message_time: lastMessage?.created_at || null,
        last_message_messenger: lastMessage?.messenger_type || null,
        unread_count: unreadMessages.length,
        unread_by_messenger: unreadByMessenger,
        last_unread_messenger: unreadMessages[0]?.messenger_type || null,
        messages: [],
        has_pending_payment: (client as any).has_pending_payment || false,
        last_message_failed: lastMessage?.is_outgoing && lastMessage?.status === 'failed',
      };
    });

  // 5. If unreadOnly, filter to only threads with unread messages
  const result = unreadOnly ? threads.filter(t => t.unread_count > 0) : threads;

  console.log(`[fetchThreadsDirectly] Built ${result.length} threads in ${(performance.now() - startTime).toFixed(2)}ms`);
  return result;
}

/**
 * Infinite scroll hook for chat threads
 * Loads 50 threads at a time for fast initial render
 * Automatically fetches more when scrolling
 */
export const useChatThreadsInfinite = (allowedBranches?: string[]) => {
  const queryClient = useQueryClient();
  const { checkAndFetchMissingAvatars } = useBulkAvatarFetch();

  // Query to get deleted client IDs (is_active = false for self-hosted)
  const { data: deletedClientIds = [] } = useQuery({
    queryKey: ['deleted-client-ids'],
    queryFn: async () => {
      // Self-hosted uses is_active (boolean) instead of status (string)
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
    queryKey: ['chat-threads-infinite', allowedBranches || 'all'],
    queryFn: async ({ pageParam = 0 }) => {
      const startTime = performance.now();
      console.log(`[useChatThreadsInfinite] Loading page ${pageParam}, offset ${pageParam * PAGE_SIZE}, branches=${allowedBranches ? allowedBranches.join(',') : 'all'}...`);

      // If RPC is broken, use direct fetch
      if (!usePaginatedRpc) {
        console.log('[useChatThreadsInfinite] Paginated RPC disabled, using direct fetch');
        const directThreads = await fetchThreadsDirectly(PAGE_SIZE + 1, pageParam * PAGE_SIZE, false, allowedBranches);
        const hasMore = directThreads.length > PAGE_SIZE;
        return { 
          threads: directThreads.slice(0, PAGE_SIZE), 
          hasMore, 
          pageParam, 
          executionTime: performance.now() - startTime 
        };
      }

      const rpcParams: any = { 
        p_limit: PAGE_SIZE + 1,
        p_offset: pageParam * PAGE_SIZE,
      };
      if (allowedBranches && allowedBranches.length > 0) {
        rpcParams.p_branches = allowedBranches;
      }

      const { data, error } = await supabase
        .rpc('get_chat_threads_paginated', rpcParams);

      if (error) {
        // If function not found - disable RPC and use fallback
        if (error.code === '42883' || error.code === 'PGRST202' || error.code === '42703' || error.code === 'PGRST203') {
          console.warn('[useChatThreadsInfinite] Disabling broken paginated RPC:', error.code, error.message);
          usePaginatedRpc = false;
          // Use direct fetch instead of returning empty
          const directThreads = await fetchThreadsDirectly(PAGE_SIZE + 1, pageParam * PAGE_SIZE, false, allowedBranches);
          const hasMore = directThreads.length > PAGE_SIZE;
          return { 
            threads: directThreads.slice(0, PAGE_SIZE), 
            hasMore, 
            pageParam, 
            executionTime: performance.now() - startTime 
          };
        }

        console.error('[useChatThreadsInfinite] RPC error, using direct fetch:', error);
        // Fallback to lightweight direct query instead of slow get_chat_threads_fast
        const directThreads = await fetchThreadsDirectly(PAGE_SIZE + 1, pageParam * PAGE_SIZE, false, allowedBranches);
        const fallbackHasMore = directThreads.length > PAGE_SIZE;
        return { 
          threads: directThreads.slice(0, PAGE_SIZE), 
          hasMore: fallbackHasMore, 
          pageParam, 
          executionTime: performance.now() - startTime 
        };
      }

      const dataArray = (data || []) as RpcThreadRow[];
      const hasMore = dataArray.length > PAGE_SIZE;
      const threads = mapRpcToThreads(dataArray.slice(0, PAGE_SIZE));

      // Enrich with has_pending_payment from clients table (RPC doesn't return it)
      const clientIds = threads.map(t => t.client_id).filter(Boolean);
      if (clientIds.length > 0) {
        const { data: pendingData } = await supabase
          .from('clients')
          .select('id, has_pending_payment')
          .in('id', clientIds)
          .eq('has_pending_payment', true);

        const pendingSet = new Set((pendingData || []).map((c: any) => c.id));
        threads.forEach(t => { (t as any).has_pending_payment = pendingSet.has(t.client_id); });
      }
      
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
      if (error?.code === '42883' || error?.code === 'PGRST202' || error?.code === '42703' || error?.code === 'PGRST203') return false;
      return failureCount < 1;
    },
    ...chatListQueryConfig,
  });

  // Set of deleted client IDs for fast lookup
  const deletedIdsSet = useMemo(() => new Set(deletedClientIds), [deletedClientIds]);

  // Simple flat list from paginated data, filter out deleted
  const allThreads = useMemo(() => {
    const paginatedPages = infiniteQuery.data?.pages || [];
    const paginatedThreads = paginatedPages.flatMap(page => page.threads);

    if (paginatedThreads.length === 0) return [];

    return paginatedThreads.filter(t => !deletedIdsSet.has(t.client_id));
  }, [infiniteQuery.data?.pages, deletedIdsSet]);

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
    await infiniteQuery.refetch();
  }, [infiniteQuery]);

  return {
    data: allThreads,
    isLoading: infiniteQuery.isLoading,
    isFetching: infiniteQuery.isFetching,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    hasNextPage: infiniteQuery.hasNextPage,
    loadMore,
    refetch,
    error: infiniteQuery.error,
  };
};

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
    
    // Infer messenger type from chat IDs if not provided by RPC
    let inferredMessenger: string | null = null;
    if (!row.last_messenger_type && !row.last_unread_messenger) {
      if (row.telegram_chat_id) inferredMessenger = 'telegram';
      else if (row.whatsapp_chat_id) inferredMessenger = 'whatsapp';
      else if (row.max_chat_id) inferredMessenger = 'max';
    }
    
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
      last_message_messenger: row.last_messenger_type || row.last_unread_messenger || inferredMessenger,
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
