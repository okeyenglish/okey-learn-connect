import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage } from './useChatMessages';

const PAGE_SIZE = 50;

export const useInfiniteChatMessages = (clientId: string) => {
  return useInfiniteQuery({
    queryKey: ['chat-messages-infinite', clientId],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error, count } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact' })
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);
      
      if (error) throw error;
      
      return {
        messages: (data as ChatMessage[]).reverse(), // для правильного порядка отображения
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
