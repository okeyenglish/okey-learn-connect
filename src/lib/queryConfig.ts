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
  staleTime: 10 * 1000, // Список чатов обновляется чаще - 10 сек
  gcTime: 10 * 60 * 1000, // Кэш 10 минут
  refetchOnWindowFocus: true, // Рефетчить список при фокусе
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
