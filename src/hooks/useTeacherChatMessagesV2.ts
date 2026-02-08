/**
 * Hook to fetch chat messages for a specific teacher (by teacher_id)
 * This is for the NEW architecture where teacher conversations are stored directly with teacher_id
 * 
 * OPTIMIZED: Uses in-memory cache for instant display and selective field queries
 */

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useMemo, useCallback, useEffect } from 'react';
import type { ChatMessage } from './useChatMessages';

const PAGE_SIZE = 50;

// In-memory cache for instant display (same pattern as useChatMessagesOptimized)
const teacherMessageCache = new Map<string, { messages: ChatMessage[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface InfinitePageData<T> {
  items: T[];
  nextCursor: number;
  hasMore: boolean;
  total: number;
}

// Optimized field selection - only fetch what we need
const MESSAGE_FIELDS = `
  id, teacher_id, message_text, message_type, system_type, is_read, is_outgoing,
  created_at, file_url, file_name, file_type, external_message_id,
  messenger_type, call_duration, message_status, metadata, content, direction,
  media_url, media_type, external_id, messenger, status
`;

/**
 * Get cached messages if valid
 */
const getCachedMessages = (teacherId: string): ChatMessage[] | null => {
  const cached = teacherMessageCache.get(teacherId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.messages;
  }
  return null;
};

/**
 * Update cache with new messages
 */
const updateCache = (teacherId: string, messages: ChatMessage[]) => {
  teacherMessageCache.set(teacherId, {
    messages,
    timestamp: Date.now(),
  });
};

/**
 * Fetch chat messages for a teacher using teacher_id
 */
export const useTeacherChatMessages = (teacherId: string) => {
  const queryClient = useQueryClient();

  // Get cached data for placeholder
  const cachedMessages = useMemo(() => {
    if (!teacherId) return null;
    return getCachedMessages(teacherId);
  }, [teacherId]);

  const query = useInfiniteQuery({
    queryKey: ['teacher-chat-messages-v2', teacherId],
    queryFn: async ({ pageParam = 0 }): Promise<InfinitePageData<ChatMessage>> => {
      if (!teacherId) {
        return { items: [], nextCursor: 0, hasMore: false, total: 0 };
      }

      const startTime = performance.now();

      // OPTIMIZATION: Select only needed fields instead of SELECT *
      // @ts-ignore - teacher_id column exists in self-hosted schema
      const { data, error } = await (supabase
        .from('chat_messages') as any)
        .select(MESSAGE_FIELDS)
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      if (error) {
        console.error('[useTeacherChatMessages] Query failed:', error.message);
        throw new Error(error.message);
      }

      const fetchedItems = data || [];
      const hasMore = fetchedItems.length >= PAGE_SIZE;
      const itemsToReturn = fetchedItems;

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

      const chronologicalItems = normalizedItems.reverse();

      // Update cache with first page
      if (pageParam === 0) {
        updateCache(teacherId, chronologicalItems);
      }

      const duration = performance.now() - startTime;
      if (duration > 100) {
        console.log(`[useTeacherChatMessages] Query took ${duration.toFixed(0)}ms for ${chronologicalItems.length} messages`);
      }

      return {
        items: chronologicalItems,
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
    staleTime: 60000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    // OPTIMIZATION: Use cached data as placeholder for instant display
    placeholderData: cachedMessages ? {
      pages: [{ items: cachedMessages, nextCursor: PAGE_SIZE, hasMore: true, total: 0 }],
      pageParams: [0],
    } : undefined,
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
          // Invalidate cache on new message
          teacherMessageCache.delete(teacherId);
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
          teacherMessageCache.delete(teacherId);
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

    // Clear cache to reflect updated read status
    teacherMessageCache.delete(teacherId);
    queryClient.invalidateQueries({ queryKey: ['teacher-chat-messages-v2', teacherId] });
    queryClient.invalidateQueries({ queryKey: ['teacher-conversations'] });
  }, [queryClient]);

  return { markAsRead };
};

/**
 * Clear cache for a specific teacher or all teachers
 */
export const clearTeacherMessageCache = (teacherId?: string) => {
  if (teacherId) {
    teacherMessageCache.delete(teacherId);
  } else {
    teacherMessageCache.clear();
  }
};

export default useTeacherChatMessages;
