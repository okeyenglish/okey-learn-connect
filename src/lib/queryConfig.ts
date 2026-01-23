import { QueryClient } from "@tanstack/react-query";

// Оптимизированная конфигурация React Query
export const queryConfig = {
  queries: {
    // Данные считаются свежими 30 секунд
    staleTime: 30 * 1000,
    
    // Кэш хранится 5 минут
    gcTime: 5 * 60 * 1000,
    
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
  staleTime: 30 * 1000, // Сообщения кешируются 30 сек
  gcTime: 10 * 60 * 1000, // Кэш сообщений 10 минут
  refetchOnWindowFocus: false, // Не рефетчить при фокусе - используем real-time
  refetchOnReconnect: true, // Но рефетчить при reconnect
};

export const chatListQueryConfig = {
  staleTime: 30 * 1000, // Список чатов обновляется раз в 30 сек (есть realtime)
  gcTime: 10 * 60 * 1000, // Кэш 10 минут
  refetchOnWindowFocus: false, // Не рефетчить при фокусе - есть realtime
};

// Конфигурация для chat_states - данные редко меняются
export const chatStatesQueryConfig = {
  staleTime: 60 * 1000, // 60 секунд - данные о pin редко меняются
  gcTime: 15 * 60 * 1000, // 15 минут
  refetchOnWindowFocus: false,
};

export const staticDataQueryConfig = {
  staleTime: 5 * 60 * 1000, // Статичные данные свежи 5 минут
  gcTime: 30 * 60 * 1000, // Кэш 30 минут
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
