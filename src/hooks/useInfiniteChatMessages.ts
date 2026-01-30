import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { ChatMessage } from './useChatMessages';

const PAGE_SIZE = 50;

export const useInfiniteChatMessages = (clientId: string) => {
  return useInfiniteQuery({
    queryKey: ['chat-messages-infinite', clientId],
    queryFn: async ({ pageParam = 0 }) => {
      // Optimized: no JOIN on clients, avatars fetched separately
      const { data, error, count } = await supabase
        .from('chat_messages')
        .select(`
          id, client_id, message_text, message_type, system_type, is_read,
          created_at, file_url, file_name, file_type, external_message_id,
          messenger_type, call_duration, message_status
        `, { count: 'exact' })
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);
      
      if (error) {
        console.error('[useInfiniteChatMessages] Query failed:', error.message);
        throw error;
      }

      const messages = (data || []) as ChatMessage[];
      
      return {
        messages: messages.reverse(),
        nextCursor: pageParam + PAGE_SIZE,
        hasMore: (count ?? 0) > pageParam + PAGE_SIZE
      };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },
    initialPageParam: 0,
    enabled: !!clientId,
  });
};

// Hook для получения всех сообщений из infinite query
export const useAllMessagesFromInfinite = (clientId: string) => {
  const { data, ...rest } = useInfiniteChatMessages(clientId);
  
  const allMessages = data?.pages.flatMap(page => page.messages) ?? [];
  
  return {
    messages: allMessages,
    ...rest
  };
};
