import { useQuery } from '@tanstack/react-query';
import { selfHostedPost } from '@/lib/selfHostedApi';

interface CallLog {
  id: string;
  created_at: string;
  direction: string;
  status: string;
}

interface CallLogsResponse {
  success: boolean;
  data?: CallLog[];
  error?: string;
}

/**
 * Hook to fetch today's calls count from self-hosted API
 * Refreshes every 5 minutes
 */
export function useTodayCallsCount() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['todayCallsCount', startOfDay],
    queryFn: async () => {
      const response = await selfHostedPost<CallLogsResponse>('get-call-logs', {
        date_from: startOfDay,
        date_to: endOfDay,
        limit: 1000,
      });

      if (!response.success || !response.data) {
        return { total: 0, incoming: 0, outgoing: 0 };
      }

      const calls = response.data.data || [];
      const incoming = calls.filter(c => c.direction === 'incoming').length;
      const outgoing = calls.filter(c => c.direction === 'outgoing').length;

      // Get last call time (calls should be sorted by created_at DESC from API)
      const sortedCalls = [...calls].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const lastCall = sortedCalls[0];
      const lastCallTime = lastCall 
        ? new Date(lastCall.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        : null;

      return {
        total: calls.length,
        incoming,
        outgoing,
        lastCallTime,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 1,
  });

  return {
    callsCount: data?.total ?? 0,
    incomingCalls: data?.incoming ?? 0,
    outgoingCalls: data?.outgoing ?? 0,
    lastCallTime: data?.lastCallTime ?? null,
    isLoading,
    error,
    refetch,
  };
}

export default useTodayCallsCount;
