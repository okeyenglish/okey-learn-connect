import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { chatQueryConfig, staticDataQueryConfig, realtimeQueryConfig } from '@/lib/queryConfig';

/**
 * Оптимизированные хуки для разных типов данных
 */

// Для чатов и сообщений (частое обновление)
export function useChatQuery<TData = unknown, TError = unknown>(
  options: UseQueryOptions<TData, TError>
) {
  return useQuery({
    ...chatQueryConfig,
    ...options,
  });
}

// Для статичных данных (редкое обновление)
export function useStaticQuery<TData = unknown, TError = unknown>(
  options: UseQueryOptions<TData, TError>
) {
  return useQuery({
    ...staticDataQueryConfig,
    ...options,
  });
}

// Для real-time данных (постоянное обновление)
export function useRealtimeQuery<TData = unknown, TError = unknown>(
  options: UseQueryOptions<TData, TError>
) {
  return useQuery({
    ...realtimeQueryConfig,
    ...options,
  });
}
