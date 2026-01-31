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

      const { data, error, count } = await supabase
        .from('chat_messages')
        .select(
          'id, teacher_id, client_id, message_text, content, message_type, system_type, is_read, is_outgoing, created_at, file_url, media_url, file_name, file_type, media_type, external_message_id, external_id, messenger_type, messenger, call_duration, message_status, status, metadata',
          { count: 'exact' }
        )
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      if (error) {
        console.error('[useTeacherChatMessages] Query failed:', error.message);
        throw new Error(error.message);
      }

      // Normalize field names for compatibility
      const normalizedItems = (data || []).map((m: Record<string, unknown>) => ({
        ...m,
        message_text: m.message_text || m.content || '',
        file_url: m.file_url || m.media_url,
        file_type: m.file_type || m.media_type,
        external_message_id: m.external_message_id || m.external_id,
        messenger_type: m.messenger_type || m.messenger,
        message_status: m.message_status || m.status,
      })) as ChatMessage[];

      const total = count ?? 0;
      const hasMore = total > pageParam + PAGE_SIZE;

      return {
        items: normalizedItems.reverse(), // Chronological order
        nextCursor: pageParam + PAGE_SIZE,
        hasMore,
        total,
      };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },
    initialPageParam: 0,
    enabled: !!teacherId,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  // Flatten all pages into a single array
  const messages = useMemo(() => {
    if (!query.data?.pages) return [];
    return query.data.pages.flatMap(page => page.items);
  }, [query.data]);

  const totalCount = useMemo(() => {
    return query.data?.pages[0]?.total ?? 0;
  }, [query.data]);

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

    const { error } = await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('teacher_id', teacherId)
      .eq('is_read', false)
      .eq('is_outgoing', false);

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
