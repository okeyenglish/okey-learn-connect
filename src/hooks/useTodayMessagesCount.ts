import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { selfHostedPost } from '@/lib/selfHostedApi';

interface TodayMessagesResponse {
  total: number;
  lastMessageTime: string | null;
}

/**
 * Hook to fetch today's sent messages count
 * Counts outgoing messages sent by the current user today
 * Uses self-hosted API endpoint to query the correct schema
 * Refreshes every 5 minutes
 */
export function useTodayMessagesCount() {
  const { user } = useAuth();
  
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['todayMessagesCount', user?.id, startOfDay],
    queryFn: async (): Promise<TodayMessagesResponse> => {
      if (!user?.id) return { total: 0, lastMessageTime: null };

      try {
        // Use self-hosted API endpoint to query the correct schema
        // Self-hosted uses message_type = 'manager' for outgoing messages
        const response = await selfHostedPost<TodayMessagesResponse>('get-today-messages-count', {
          user_id: user.id,
          start_of_day: startOfDay,
          end_of_day: endOfDay,
        });

        if (response.success && response.data) {
          return response.data;
        }

        // If API call fails, return defaults
        console.warn('[useTodayMessagesCount] API call failed:', response.error);
        return { total: 0, lastMessageTime: null };
      } catch (err) {
        console.error('[useTodayMessagesCount] Error:', err);
        return { total: 0, lastMessageTime: null };
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 1,
  });

  return {
    messagesCount: data?.total ?? 0,
    lastMessageTime: data?.lastMessageTime ?? null,
    isLoading,
    error,
    refetch,
  };
}

export default useTodayMessagesCount;
