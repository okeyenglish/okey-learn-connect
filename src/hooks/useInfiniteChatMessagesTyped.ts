/**
 * Рефакторинг useInfiniteChatMessages с использованием типизированных хуков
 * 
 * Преимущества:
 * - Полная типобезопасность через TypedQueries
 * - Унифицированный API с остальными хуками
 * - Автоматическое управление кешем React Query
 * - Встроенная поддержка prefetch
 */

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { 
  useInfiniteTypedQueryJoin, 
  getAllItemsFromInfinite,
  getTotalFromInfinite,
  queryKeys,
  type InfinitePageData 
} from '@/integrations/supabase/useTypedQueries';
import { JoinSelects } from '@/integrations/supabase/typedHelpers';
import type { ChatMessage } from './useChatMessages';
import { useMemo, useCallback } from 'react';

const PAGE_SIZE = 50;

// ============ Типы для JOIN результата ============

interface ChatMessageWithClient extends ChatMessage {
  clients?: {
    avatar_url?: string | null;
    whatsapp_chat_id?: string | null;
  } | null;
}

// ============ Join select строка для сообщений ============

const MESSAGE_WITH_CLIENT_SELECT = `
  *,
  clients(avatar_url, whatsapp_chat_id)
`;

// ============ Основной типизированный хук ============

/**
 * Типизированный infinite scroll хук для сообщений чата
 * 
 * @example
 * const { 
 *   messages, 
 *   fetchNextPage, 
 *   hasNextPage, 
 *   isLoading 
 * } = useInfiniteChatMessagesTyped(clientId);
 * 
 * // Загрузить ещё при скролле
 * if (hasNextPage) fetchNextPage();
 */
export const useInfiniteChatMessagesTyped = (clientId: string) => {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ['chat-messages-infinite-typed', clientId],
    queryFn: async ({ pageParam = 0 }): Promise<InfinitePageData<ChatMessage>> => {
      // Попытка с JOIN на clients для получения аватара
      const { data: primaryData, error: primaryError, count } = await supabase
        .from('chat_messages')
        .select(MESSAGE_WITH_CLIENT_SELECT, { count: 'exact' })
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE);

      // Fallback если JOIN не прошёл из-за RLS
      if (primaryError || (!primaryData?.length && pageParam === 0)) {
        console.warn('[useInfiniteChatMessagesTyped] Join failed, using fallback:', primaryError?.message);
        
        const { data: fallbackData, error: fallbackError, count: fallbackCount } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact' })
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .range(pageParam, pageParam + PAGE_SIZE);

        if (fallbackError) throw new Error(fallbackError.message);

        const items = (fallbackData || []) as ChatMessage[];
        const total = fallbackCount ?? 0;
        const hasMore = total > pageParam + PAGE_SIZE;

        return {
          items: items.reverse(), // Хронологический порядок
          nextCursor: pageParam + PAGE_SIZE,
          hasMore,
          total,
        };
      }

      const items = (primaryData as ChatMessageWithClient[]) || [];
      const total = count ?? 0;
      const hasMore = total > pageParam + PAGE_SIZE;

      return {
        items: (items as ChatMessage[]).reverse(),
        nextCursor: pageParam + PAGE_SIZE,
        hasMore,
        total,
      };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },
    initialPageParam: 0,
    enabled: !!clientId,
    staleTime: 30000, // 30 секунд
    gcTime: 5 * 60 * 1000, // 5 минут
  });

  // Мемоизированный список всех сообщений
  const messages = useMemo(() => {
    return getAllItemsFromInfinite(query.data);
  }, [query.data]);

  // Общее количество сообщений
  const totalCount = useMemo(() => {
    return getTotalFromInfinite(query.data);
  }, [query.data]);

  // Prefetch следующей страницы
  const prefetchNext = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [query]);

  return {
    messages,
    totalCount,
    ...query,
    prefetchNext,
  };
};

// ============ Хук для получения всех сообщений (совместимость) ============

/**
 * Хук-обёртка для получения плоского списка сообщений
 * Совместим с существующим useAllMessagesFromInfinite API
 * 
 * @example
 * const { messages, isLoading, fetchNextPage } = useAllMessagesTyped(clientId);
 */
export const useAllMessagesTyped = (clientId: string) => {
  const { messages, ...rest } = useInfiniteChatMessagesTyped(clientId);
  
  return {
    messages,
    ...rest,
  };
};

// ============ Prefetch хелпер ============

/**
 * Хук для prefetch сообщений при наведении на чат
 * 
 * @example
 * const { prefetch, cancel } = usePrefetchChatMessagesTyped();
 * 
 * <div 
 *   onMouseEnter={() => prefetch(clientId)} 
 *   onMouseLeave={cancel}
 * >
 */
export const usePrefetchChatMessagesTyped = () => {
  const queryClient = useQueryClient();
  const abortControllers = useMemo(() => new Map<string, AbortController>(), []);

  const prefetch = useCallback((clientId: string) => {
    // Отменяем предыдущий prefetch для этого клиента
    abortControllers.get(clientId)?.abort();

    const controller = new AbortController();
    abortControllers.set(clientId, controller);

    // Проверяем свежесть кеша
    const existingData = queryClient.getQueryData(['chat-messages-infinite-typed', clientId]);
    const queryState = queryClient.getQueryState(['chat-messages-infinite-typed', clientId]);
    
    if (existingData && queryState?.dataUpdatedAt) {
      const age = Date.now() - queryState.dataUpdatedAt;
      if (age < 30000) return; // Данные свежие (< 30 сек)
    }

    // Prefetch первой страницы
    queryClient.prefetchInfiniteQuery({
      queryKey: ['chat-messages-infinite-typed', clientId],
      queryFn: async ({ pageParam = 0 }) => {
        const { data, error, count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact' })
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .range(pageParam, pageParam + PAGE_SIZE - 1);

        if (error) throw new Error(error.message);

        const items = (data || []) as ChatMessage[];
        const total = count ?? 0;

        return {
          items: items.reverse(),
          nextCursor: pageParam + PAGE_SIZE,
          hasMore: total > pageParam + PAGE_SIZE,
          total,
        };
      },
      initialPageParam: 0,
      staleTime: 30000,
    });
  }, [queryClient, abortControllers]);

  const cancel = useCallback((clientId?: string) => {
    if (clientId) {
      abortControllers.get(clientId)?.abort();
      abortControllers.delete(clientId);
    } else {
      abortControllers.forEach(c => c.abort());
      abortControllers.clear();
    }
  }, [abortControllers]);

  return { prefetch, cancel };
};

// ============ Экспорт для обратной совместимости ============

export default useInfiniteChatMessagesTyped;
