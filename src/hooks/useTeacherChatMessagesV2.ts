/**
 * Hook to fetch chat messages for a specific teacher (by teacher_id)
 * This is for the NEW architecture where teacher conversations are stored directly with teacher_id
 */

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useMemo, useCallback, useEffect } from 'react';
import type { ChatMessage } from './useChatMessages';

const PAGE_SIZE = 50;

interface InfinitePageData<T> {
  items: T[];
  nextCursor: number;
  hasMore: boolean;
  total: number;
}

/**
 * Fetch chat messages for a teacher using teacher_id
 */
export const useTeacherChatMessages = (teacherId: string) => {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ['teacher-chat-messages-v2', teacherId],
    queryFn: async ({ pageParam = 0 }): Promise<InfinitePageData<ChatMessage>> => {
      if (!teacherId) {
        return { items: [], nextCursor: 0, hasMore: false, total: 0 };
      }

      // OPTIMIZATION: Removed count: 'exact' - it's expensive on large tables
      // Instead, fetch PAGE_SIZE + 1 to detect if there are more pages
      // @ts-ignore - teacher_id column exists in self-hosted schema
      const { data, error } = await (supabase
        .from('chat_messages') as any)
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE); // +1 to check hasMore

      if (error) {
        console.error('[useTeacherChatMessages] Query failed:', error.message);
        throw new Error(error.message);
      }

      const fetchedItems = data || [];
      const hasMore = fetchedItems.length > PAGE_SIZE;
      const itemsToReturn = hasMore ? fetchedItems.slice(0, PAGE_SIZE) : fetchedItems;

      // Normalize field names for compatibility (self-hosted vs Cloud schema)
      const normalizedItems = itemsToReturn.map((m: any) => ({
        ...m,
        message_text: m.message_text || m.content || '',
        content: m.content || m.message_text || '',
        file_url: m.file_url || m.media_url,
        media_url: m.media_url || m.file_url,
        file_type: m.file_type || m.media_type,
        media_type: m.media_type || m.file_type,
        external_message_id: m.external_message_id || m.external_id,
        external_id: m.external_id || m.external_message_id,
        messenger_type: m.messenger_type || m.messenger,
        messenger: m.messenger || m.messenger_type,
        message_status: m.message_status || m.status,
        status: m.status || m.message_status,
        is_outgoing: m.is_outgoing ?? (m.direction === 'outgoing'),
        direction: m.direction || (m.is_outgoing ? 'outgoing' : 'incoming'),
      })) as ChatMessage[];

      return {
        items: normalizedItems.reverse(), // Chronological order
        nextCursor: pageParam + PAGE_SIZE,
        hasMore,
        total: 0, // Not using total anymore for performance
      };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },
    initialPageParam: 0,
    enabled: !!teacherId,
    staleTime: 60000, // Increased to 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  });

  // Flatten all pages into a single array
  const messages = useMemo(() => {
    if (!query.data?.pages) return [];
    return query.data.pages.flatMap(page => page.items);
  }, [query.data]);

  // Total count is no longer accurate (removed for performance)
  // Use messages.length instead if needed
  const totalCount = useMemo(() => {
    return messages.length;
  }, [messages]);

  const prefetchNext = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [query]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!teacherId) return;

    const channel = supabase
      .channel(`teacher-chat-messages-${teacherId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `teacher_id=eq.${teacherId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['teacher-chat-messages-v2', teacherId] });
          queryClient.invalidateQueries({ queryKey: ['teacher-conversations'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `teacher_id=eq.${teacherId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['teacher-chat-messages-v2', teacherId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teacherId, queryClient]);

  return {
    messages,
    totalCount,
    ...query,
    prefetchNext,
  };
};

/**
 * Mark all teacher chat messages as read
 */
export const useMarkTeacherChatMessagesAsRead = () => {
  const queryClient = useQueryClient();

  const markAsRead = useCallback(async (teacherId: string) => {
    if (!teacherId) return;

    // @ts-ignore - teacher_id column exists in self-hosted schema
    const { error } = await (supabase
      .from('chat_messages') as any)
      .update({ is_read: true })
      .eq('teacher_id', teacherId)
      .eq('is_read', false);

    if (error) {
      console.error('[useMarkTeacherChatMessagesAsRead] Error:', error);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['teacher-chat-messages-v2', teacherId] });
    queryClient.invalidateQueries({ queryKey: ['teacher-conversations'] });
  }, [queryClient]);

  return { markAsRead };
};

export default useTeacherChatMessages;
