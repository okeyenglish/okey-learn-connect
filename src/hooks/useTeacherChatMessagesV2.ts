/**
 * Hook to fetch chat messages for a specific teacher (by teacher_id)
 * This is for the NEW architecture where teacher conversations are stored directly with teacher_id
 * 
 * OPTIMIZED: Uses in-memory cache for instant display and selective field queries
 */

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useMemo, useCallback, useEffect, useRef } from 'react';
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

// Optimized field selection - self-hosted actual columns
const MESSAGE_FIELDS = `
  id, teacher_id, message_text, message_type, system_type, is_read, is_outgoing,
  created_at, file_url, file_name, file_type, external_message_id,
  messenger_type, call_duration, message_status, metadata, sender_name
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

// Empty result for disabled queries - stable reference to prevent re-renders
const EMPTY_MESSAGES: ChatMessage[] = [];
const EMPTY_RESULT = {
  messages: EMPTY_MESSAGES,
  totalCount: 0,
  data: undefined,
  error: null,
  isLoading: false,
  isFetching: false,
  isError: false,
  isSuccess: false,
  isPending: true,
  status: 'pending' as const,
  fetchNextPage: () => Promise.resolve({ data: undefined, error: null }),
  hasNextPage: false,
  isFetchingNextPage: false,
  prefetchNext: () => {},
  refetch: () => Promise.resolve({ data: undefined, error: null }),
};

/**
 * Internal hook that actually uses useInfiniteQuery
 * Only called when teacherId is valid
 */
const useTeacherChatMessagesInternal = (teacherId: string) => {
  const queryClient = useQueryClient();

  // Get cached data for placeholder
  const cachedMessages = useMemo(() => {
    return getCachedMessages(teacherId);
  }, [teacherId]);

  const query = useInfiniteQuery({
    queryKey: ['teacher-chat-messages-v2', teacherId],
    queryFn: async ({ pageParam = 0 }): Promise<InfinitePageData<ChatMessage>> => {
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

      // Self-hosted DB columns match ChatMessage interface directly
      const normalizedItems = fetchedItems as ChatMessage[];

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
        total: 0,
      };
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage) return undefined;
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },
    initialPageParam: 0,
    staleTime: 60000,
    gcTime: 10 * 60 * 1000,
    placeholderData: cachedMessages ? {
      pages: [{ items: cachedMessages, nextCursor: PAGE_SIZE, hasMore: true, total: 0 }],
      pageParams: [0],
    } : undefined,
  });

  // Flatten all pages into a single array
  const messages = useMemo(() => {
    if (!query.data?.pages) return EMPTY_MESSAGES;
    return query.data.pages.flatMap(page => page?.items || []);
  }, [query.data]);

  const totalCount = messages.length;

  const prefetchNext = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [query]);

  // Real-time subscription for new messages
  useEffect(() => {
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
 * Fetch chat messages for a teacher using teacher_id
 * 
 * CRITICAL: This hook safely handles empty teacherId by returning stable empty results
 * without calling useInfiniteQuery, which prevents "pages is undefined" errors in TanStack Query v5
 */
export const useTeacherChatMessages = (teacherId: string) => {
  // Track if we should use the real query
  const isEnabled = !!teacherId && teacherId.length > 0;
  
  // Use ref to maintain stable identity of teacherId for the internal hook
  const stableTeacherId = useRef(teacherId);
  if (isEnabled) {
    stableTeacherId.current = teacherId;
  }

  // CRITICAL: Call internal hook only when enabled
  // When disabled, we return EMPTY_RESULT which has the same shape
  const internalResult = useTeacherChatMessagesInternal(
    isEnabled ? teacherId : '__disabled__'
  );

  // Return empty result when disabled, otherwise return real query result
  if (!isEnabled) {
    return EMPTY_RESULT;
  }

  return internalResult;
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
