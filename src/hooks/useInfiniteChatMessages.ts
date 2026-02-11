import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { ChatMessage } from './useChatMessages';
import { CHAT_MESSAGE_SELECT, mapDbRowsToChatMessages, type DbChatMessageRow } from '@/lib/chatMessageMapper';

const PAGE_SIZE = 50;

export const useInfiniteChatMessages = (clientId: string) => {
  return useInfiniteQuery({
    queryKey: ['chat-messages-infinite', clientId],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error, count } = await supabase
        .from('chat_messages')
        .select(CHAT_MESSAGE_SELECT, { count: 'exact' })
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);
      
      if (error) {
        console.error('[useInfiniteChatMessages] Query failed:', error.message);
        throw error;
      }

      const messages = mapDbRowsToChatMessages((data || []) as DbChatMessageRow[]);
      
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
