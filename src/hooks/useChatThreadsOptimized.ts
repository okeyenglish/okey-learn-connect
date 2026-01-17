import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChatThread, UnreadByMessenger } from './useChatMessages';
import { chatListQueryConfig } from '@/lib/queryConfig';

/**
 * Optimized hook for loading chat threads using RPC function
 * Uses database RPC for 10x faster queries (single query vs 4 sequential)
 */
export const useChatThreadsOptimized = () => {
  return useQuery({
    queryKey: ['chat-threads'],
    queryFn: async (): Promise<ChatThread[]> => {
      console.log('[useChatThreadsOptimized] Starting optimized RPC fetch...');
      const startTime = performance.now();

      // Use optimized RPC function for fast chat threads loading
      const { data, error } = await supabase
        .rpc('get_chat_threads_optimized', { p_limit: 200 });

      if (error) {
        console.error('[useChatThreadsOptimized] RPC error, falling back to fast method:', error);
        // Fallback to get_chat_threads_fast if available
        const { data: fallbackData, error: fallbackError } = await supabase
          .rpc('get_chat_threads_fast', { p_limit: 200 });
        
        if (fallbackError) {
          console.error('[useChatThreadsOptimized] Fallback RPC also failed:', fallbackError);
          throw fallbackError;
        }
        
        return mapRpcToThreads(fallbackData || [], startTime);
      }

      return mapRpcToThreads(data || [], startTime);
    },
    ...chatListQueryConfig,
    // Keep previous data while loading for smooth UX
    placeholderData: (previousData) => previousData,
  });
};

// Helper function to map RPC result to ChatThread format
function mapRpcToThreads(data: any[], startTime: number): ChatThread[] {
  // Filter out group chats (telegram groups have negative chat_id)
  // Also exclude system chats (corporate, teachers)
  const filteredData = data.filter((row: any) => {
    // Check for negative telegram_chat_id (group chats)
    const telegramChatId = row.telegram_chat_id;
    if (telegramChatId) {
      const chatIdNum = typeof telegramChatId === 'string' 
        ? parseInt(telegramChatId, 10) 
        : telegramChatId;
      if (chatIdNum < 0) return false;
    }
    
    // Exclude system chats by name patterns
    const name = (row.client_name || '').toLowerCase();
    if (name.includes('корпоративный') || 
        name.includes('педагог') || 
        name.includes('преподаватель:')) {
      return false;
    }
    
    return true;
  });

  const threads: ChatThread[] = filteredData.map((row: any) => ({
    client_id: row.client_id,
    client_name: row.client_name || '',
    client_phone: row.client_phone || '',
    client_branch: row.client_branch || null,
    avatar_url: row.avatar_url || null,
    telegram_avatar_url: row.telegram_avatar_url || null,
    whatsapp_avatar_url: row.whatsapp_avatar_url || null,
    max_avatar_url: row.max_avatar_url || null,
    last_message: row.last_message || '',
    last_message_time: row.last_message_time,
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
  }));

  const endTime = performance.now();
  console.log(`[useChatThreadsOptimized] ✅ Completed in ${(endTime - startTime).toFixed(2)}ms, ${threads.length} threads (filtered from ${data.length})`);

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

      // Group by client
      const unreadByClient = new Map<string, { count: number; lastMessenger: string; lastTime: string }>();

      (data || []).forEach((msg: any) => {
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
