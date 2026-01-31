import { QueryClient } from "@tanstack/react-query";

// Оптимизированная конфигурация React Query
export const queryConfig = {
  queries: {
    // Данные считаются свежими 60 секунд (увеличено для снижения нагрузки)
    staleTime: 60 * 1000,
    
    // Кэш хранится 10 минут
    gcTime: 10 * 60 * 1000,
    
    // Не рефетчить при фокусе окна для стабильности UI
    refetchOnWindowFocus: false,
    
    // Не рефетчить при reconnect для экономии запросов
    refetchOnReconnect: false,
    
    // Retry только один раз для ускорения обработки ошибок
    retry: 1,
    
    // Retry delay 1 секунда
    retryDelay: 1000,
  },
};

// Создаем оптимизированный Query Client
export const createOptimizedQueryClient = () => {
  return new QueryClient({
    defaultOptions: queryConfig,
  });
};

// Специальные конфигурации для разных типов запросов
export const chatQueryConfig = {
  staleTime: 60 * 1000, // Сообщения кешируются 60 сек (есть realtime)
  gcTime: 15 * 60 * 1000, // Кэш сообщений 15 минут
  refetchOnWindowFocus: false, // Не рефетчить при фокусе - используем real-time
  refetchOnReconnect: true, // Но рефетчить при reconnect
};

export const chatListQueryConfig = {
  staleTime: 60 * 1000, // Список чатов обновляется раз в 60 сек (есть realtime)
  gcTime: 15 * 60 * 1000, // Кэш 15 минут
  refetchOnWindowFocus: false, // Не рефетчить при фокусе - есть realtime
};

// Конфигурация для chat_states - данные редко меняются
export const chatStatesQueryConfig = {
  staleTime: 5 * 60 * 1000, // 5 минут - данные о pin редко меняются
  gcTime: 30 * 60 * 1000, // 30 минут
  refetchOnWindowFocus: false,
};

export const staticDataQueryConfig = {
  staleTime: 10 * 60 * 1000, // Статичные данные свежи 10 минут
  gcTime: 60 * 60 * 1000, // Кэш 1 час
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};

export const realtimeQueryConfig = {
  staleTime: 0, // Real-time данные всегда считаются устаревшими
  gcTime: 1 * 60 * 1000, // Короткий кэш 1 минута
  refetchOnWindowFocus: true,
};

/**
 * Batched query invalidation helper
 * Groups multiple invalidations into a single batch for performance
 */
export const batchInvalidate = (queryClient: QueryClient, keys: string[][]) => {
  // Use setTimeout to batch invalidations in next tick
  setTimeout(() => {
    keys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: key });
    });
  }, 0);
};

/**
 * Smart refetch strategy - only refetch if data is stale
 */
export const smartRefetch = (queryClient: QueryClient, queryKey: string[]) => {
  const state = queryClient.getQueryState(queryKey);
  if (!state) return;

  const isStale = state.dataUpdatedAt && (Date.now() - state.dataUpdatedAt > 30000);
  const isFetching = state.fetchStatus === 'fetching';

  if (isStale && !isFetching) {
    queryClient.invalidateQueries({ queryKey });
  }
};
