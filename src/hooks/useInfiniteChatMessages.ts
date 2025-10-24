import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage } from './useChatMessages';

const PAGE_SIZE = 50;

export const useInfiniteChatMessages = (clientId: string) => {
  return useInfiniteQuery({
    queryKey: ['chat-messages-infinite', clientId],
    queryFn: async ({ pageParam = 0 }) => {
      // Try with avatar join first
      const primary = await supabase
        .from('chat_messages')
        .select(`
          *,
          clients(avatar_url, whatsapp_chat_id)
        `, { count: 'exact' })
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);
      
      let data: any[] = primary.data as any[] || [];
      let count = primary.count;
      
      // Fallback if join fails due to RLS
      if (primary.error || (!data.length && pageParam === 0)) {
        console.warn('[useInfiniteChatMessages] Join failed, falling back:', primary.error?.message);
        const fallback = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact' })
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .range(pageParam, pageParam + PAGE_SIZE - 1);
        
        if (fallback.error) throw fallback.error;
        data = fallback.data as any[] || [];
        count = fallback.count;
      }
      
      return {
        messages: (data as ChatMessage[]).reverse(),
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
