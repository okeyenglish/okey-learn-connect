import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { ChatThread, UnreadByMessenger } from './useChatMessages';
import { chatListQueryConfig } from '@/lib/queryConfig';
import { isGroupChatName, isTelegramGroup } from './useCommunityChats';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { startMetric, endMetric } from '@/lib/performanceMetrics';

interface RpcThreadRow {
  client_id: string;
  client_name?: string | null;
  client_phone?: string | null;
  client_branch?: string | null;
  avatar_url?: string | null;
  telegram_avatar_url?: string | null;
  whatsapp_avatar_url?: string | null;
  max_avatar_url?: string | null;
  telegram_chat_id?: string | null;
  last_message_text?: string | null;
  last_message?: string | null;
  last_message_time?: string | null;
  unread_count?: number | null;
  unread_whatsapp?: number | null;
  unread_telegram?: number | null;
  unread_max?: number | null;
  unread_email?: number | null;
  missed_calls_count?: number | null;
  last_unread_messenger?: string | null;
  last_messenger_type?: string | null;
}

interface UnreadMessageRow {
  client_id: string;
}

interface UnreadCountRow {
  client_id: string;
  messenger_type?: string | null;
  created_at: string;
}

/**
 * Optimized hook for loading chat threads using RPC function
 * Step 1: Fast load recent threads (200)
 * Step 2: Separately load unread client IDs
 * Step 3: Fetch missing unread threads and merge
 */
export const useChatThreadsOptimized = () => {
  // All useState hooks must be called first, unconditionally
  const [missingUnreadThreads, setMissingUnreadThreads] = useState<ChatThread[]>([]);
  const [isMissingLoading, setIsMissingLoading] = useState(false);

  // Step 1: Fast load from materialized view (9ms) with fallback to optimized RPC (257ms)
  const recentThreadsQuery = useQuery({
    queryKey: ['chat-threads'],
    queryFn: async (): Promise<ChatThread[]> => {
      const metricId = startMetric('chat-threads-list', { source: 'mv' });

      try {
        // Try materialized view first (fastest: ~9ms)
        const { data, error } = await supabase
          .rpc('get_chat_threads_from_mv', { p_limit: 200 });

        if (error) {
          console.warn('[useChatThreadsOptimized] MV error, falling back to optimized RPC:', error.message);
          
          // Fallback to optimized RPC (~257ms)
          const { data: fallbackData, error: fallbackError } = await supabase
            .rpc('get_chat_threads_optimized', { p_limit: 200 });
          
          if (fallbackError) {
            console.error('[useChatThreadsOptimized] Optimized RPC also failed, trying fast:', fallbackError);
            const { data: fastData, error: fastError } = await supabase
              .rpc('get_chat_threads_fast', { p_limit: 200 });
            if (fastError) {
              endMetric(metricId, 'failed', { error: fastError.message });
              throw fastError;
            }
            const threads = mapRpcToThreads((fastData || []) as RpcThreadRow[]);
            endMetric(metricId, 'completed', { count: threads.length, method: 'fast' });
            return threads;
          }
          
          const threads = mapRpcToThreads((fallbackData || []) as RpcThreadRow[]);
          endMetric(metricId, 'completed', { count: threads.length, method: 'optimized' });
          return threads;
        }

        const threads = mapRpcToThreads((data || []) as RpcThreadRow[]);
        endMetric(metricId, 'completed', { count: threads.length, method: 'mv' });
        return threads;
      } catch (err) {
        endMetric(metricId, 'failed', { error: String(err) });
        throw err;
      }
    },
    ...chatListQueryConfig,
    placeholderData: (previousData) => previousData,
  });

  // Step 2: Load unread client IDs (fast, uses partial index, LIMITED to prevent timeout)
  const unreadClientsQuery = useQuery({
    queryKey: ['unread-client-ids'],
    queryFn: async (): Promise<string[]> => {
      console.log('[useChatThreadsOptimized] Step 2: Loading unread client IDs...');
      const startTime = performance.now();
      
      // IMPORTANT: Limit to 500 to prevent statement timeout on large datasets
      const { data, error } = await supabase
        .from('chat_messages')
        .select('client_id')
        .eq('is_read', false)
        .eq('message_type', 'client')
        .order('created_at', { ascending: false })
        .limit(1000); // Get recent 1000 unread messages, then dedupe

      if (error) throw error;

      const rows = (data || []) as UnreadMessageRow[];
      // Get unique client IDs (deduped from limited set)
      const clientIds = [...new Set(rows.map(m => m.client_id))];
      console.log(`[useChatThreadsOptimized] Step 2: Found ${clientIds.length} clients with unread in ${(performance.now() - startTime).toFixed(2)}ms`);
      return clientIds;
    },
    staleTime: 15000, // Increased staleTime to reduce requests
    refetchOnWindowFocus: false,
  });

  // Step 3: Load missing unread threads (those not in recent)
  useEffect(() => {
    const loadMissingUnread = async () => {
      const recentThreads = recentThreadsQuery.data;
      const unreadClientIds = unreadClientsQuery.data;

      if (!recentThreads || !unreadClientIds || unreadClientIds.length === 0) {
        setMissingUnreadThreads([]);
        return;
      }

      // Find which unread clients are NOT in recent threads
      const recentClientIds = new Set(recentThreads.map(t => t.client_id));
      const missingIds = unreadClientIds.filter(id => !recentClientIds.has(id));

      if (missingIds.length === 0) {
        console.log('[useChatThreadsOptimized] Step 3: All unread chats are in recent, no need to load more');
        setMissingUnreadThreads([]);
        return;
      }

      console.log(`[useChatThreadsOptimized] Step 3: Loading ${missingIds.length} missing unread threads...`);
      setIsMissingLoading(true);
      const startTime = performance.now();

      try {
        const { data, error } = await supabase
          .rpc('get_chat_threads_by_client_ids', { p_client_ids: missingIds });

        if (error) {
          console.error('[useChatThreadsOptimized] Failed to load missing unread:', error);
          setMissingUnreadThreads([]);
        } else {
          const threads = mapRpcToThreads((data || []) as RpcThreadRow[]);
          setMissingUnreadThreads(threads);
          setMissingUnreadThreads(threads);
        }
      } catch (e) {
        console.error('[useChatThreadsOptimized] Error loading missing unread:', e);
        setMissingUnreadThreads([]);
      } finally {
        setIsMissingLoading(false);
      }
    };

    loadMissingUnread();
  }, [recentThreadsQuery.data, unreadClientsQuery.data]);

  // Merge recent threads + missing unread threads
  const mergedThreads = useMemo(() => {
    const recent = recentThreadsQuery.data || [];
    const missing = missingUnreadThreads || [];

    if (missing.length === 0) return recent;

    // Combine and sort: unread first, then by time
    const combined = [...recent, ...missing];
    
    // Deduplicate by client_id (in case of race conditions)
    const seen = new Set<string>();
    const unique = combined.filter(t => {
      if (seen.has(t.client_id)) return false;
      seen.add(t.client_id);
      return true;
    });

    // Sort: unread first, then by last_message_time desc
    unique.sort((a, b) => {
      const aHasUnread = a.unread_count > 0 ? 0 : 1;
      const bHasUnread = b.unread_count > 0 ? 0 : 1;
      if (aHasUnread !== bHasUnread) return aHasUnread - bHasUnread;
      
      const aTime = new Date(a.last_message_time || 0).getTime();
      const bTime = new Date(b.last_message_time || 0).getTime();
      return bTime - aTime;
    });

    return unique;
  }, [recentThreadsQuery.data, missingUnreadThreads]);

  return {
    data: mergedThreads,
    isLoading: recentThreadsQuery.isLoading,
    isFetching: recentThreadsQuery.isFetching || isMissingLoading,
    error: recentThreadsQuery.error,
    refetch: recentThreadsQuery.refetch,
  };
};

// Helper function to map RPC result to ChatThread format
function mapRpcToThreads(data: RpcThreadRow[], startTime?: number): ChatThread[] {
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
    
    // Exclude group chats by name patterns (ЖК, Английский язык, etc.)
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

  const threads: ChatThread[] = filteredData.map((row) => ({
    client_id: row.client_id, // get_chat_threads_optimized returns client_id directly
    client_name: row.client_name || '',
    client_phone: row.client_phone || '',
    client_branch: row.client_branch || null,
    avatar_url: row.avatar_url || null,
    telegram_avatar_url: row.telegram_avatar_url || null,
    whatsapp_avatar_url: row.whatsapp_avatar_url || null,
    max_avatar_url: row.max_avatar_url || null,
    last_message: row.last_message_text || row.last_message || '',
    last_message_time: row.last_message_time || '',
    unread_count: Number(row.unread_count) || 0,
    unread_by_messenger: {
      whatsapp: Number(row.unread_whatsapp) || 0,
      telegram: Number(row.unread_telegram) || 0,
      max: Number(row.unread_max) || 0,
      email: Number(row.unread_email) || 0,
      calls: Number(row.missed_calls_count) || 0,
    } as UnreadByMessenger,
    last_unread_messenger: row.last_unread_messenger || row.last_messenger_type || null,
    messages: []
  }));

  return threads;
}

/**
 * Hook to get threads with unread messages only (faster for notifications)
 */
export const useUnreadThreads = () => {
  return useQuery({
    queryKey: ['unread-threads'],
    queryFn: async () => {
      // Uses idx_chat_messages_client_unread partial index for fast unread lookup
      const { data, error } = await supabase
        .from('chat_messages')
        .select('client_id, messenger_type, created_at')
        .eq('is_read', false)
        .eq('message_type', 'client')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      const rows = (data || []) as UnreadCountRow[];

      // Group by client
      const unreadByClient = new Map<string, { count: number; lastMessenger: string; lastTime: string }>();

      rows.forEach((msg) => {
        const clientId = msg.client_id;
        if (!unreadByClient.has(clientId)) {
          unreadByClient.set(clientId, {
            count: 0,
            lastMessenger: msg.messenger_type || 'whatsapp',
            lastTime: msg.created_at
          });
        }
        unreadByClient.get(clientId)!.count++;
      });

      return Array.from(unreadByClient.entries()).map(([clientId, data]) => ({
        client_id: clientId,
        unread_count: data.count,
        last_unread_messenger: data.lastMessenger,
        last_unread_time: data.lastTime
      }));
    },
    staleTime: 5000,
    refetchOnWindowFocus: true,
  });
};
