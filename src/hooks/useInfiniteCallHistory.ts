import { useInfiniteQuery } from "@tanstack/react-query";
import { selfHostedPost } from "@/lib/selfHostedApi";
import type { CallLog } from "./useCallHistory";

interface CallLogsResponse {
  success: boolean;
  calls: CallLog[];
  total: number;
  hasMore?: boolean;
}

const PAGE_SIZE = 20;

export const useInfiniteCallHistory = (clientId: string) => {
  return useInfiniteQuery({
    queryKey: ['call-logs-infinite', clientId],
    queryFn: async ({ pageParam = 0 }): Promise<{ calls: CallLog[]; nextOffset: number | null; total: number }> => {
      const response = await selfHostedPost<CallLogsResponse>('get-call-logs', {
        action: 'history',
        clientId,
        limit: PAGE_SIZE,
        offset: pageParam
      });

      if (!response.success) {
        throw new Error(response.error || 'Ошибка загрузки звонков');
      }

      const calls = response.data?.calls || [];
      const total = response.data?.total || 0;
      const hasMore = response.data?.hasMore ?? (pageParam + calls.length < total);

      return {
        calls,
        nextOffset: hasMore ? pageParam + PAGE_SIZE : null,
        total
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    enabled: !!clientId,
  });
};
