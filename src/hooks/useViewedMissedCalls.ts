import { useState, useCallback, useEffect } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { selfHostedPost } from '@/lib/selfHostedApi';

interface MarkViewedResponse {
  success: boolean;
  markedCount?: number;
  error?: string;
}

interface UnviewedCountResponse {
  success: boolean;
  unviewedCount: number;
  unviewedIds: string[];
  error?: string;
}

// Server-based hook for marking calls as viewed
export const useViewedMissedCalls = (clientId: string) => {
  const queryClient = useQueryClient();

  // Mark all current missed calls as viewed for this client (server-side)
  const markCallsAsViewed = useCallback(async (callIds: string[]) => {
    if (!callIds.length) return;

    try {
      const response = await selfHostedPost<MarkViewedResponse>('mark-calls-viewed', {
        action: 'mark',
        clientId,
        callIds,
      });

      if (response.success) {
        console.log(`[useViewedMissedCalls] Marked ${response.data?.markedCount || callIds.length} calls as viewed`);
        
        // Invalidate queries to update UI
        queryClient.invalidateQueries({ queryKey: ['client-unread-by-messenger', clientId] });
        queryClient.invalidateQueries({ queryKey: ['unviewed-missed-calls', clientId] });
      } else {
        console.warn('[useViewedMissedCalls] Failed to mark calls:', response.error);
      }
    } catch (error) {
      console.error('[useViewedMissedCalls] Error marking calls as viewed:', error);
    }
  }, [clientId, queryClient]);

  return {
    markCallsAsViewed,
  };
};

// Hook to get unviewed missed calls count from server
export const useUnviewedMissedCallsCount = (clientId: string) => {
  return useQuery({
    queryKey: ['unviewed-missed-calls', clientId],
    queryFn: async (): Promise<{ count: number; ids: string[] }> => {
      if (!clientId) {
        return { count: 0, ids: [] };
      }

      const response = await selfHostedPost<UnviewedCountResponse>('mark-calls-viewed', {
        action: 'get-unviewed-count',
        clientId,
      });

      if (!response.success || !response.data) {
        return { count: 0, ids: [] };
      }

      return {
        count: response.data.unviewedCount,
        ids: response.data.unviewedIds,
      };
    },
    enabled: !!clientId,
    staleTime: 30000, // 30 seconds
  });
};

// Legacy compatibility - non-hook version for use in queryFn
export const getUnviewedMissedCallsCount = async (clientId: string): Promise<number> => {
  if (!clientId) return 0;

  try {
    const response = await selfHostedPost<UnviewedCountResponse>('mark-calls-viewed', {
      action: 'get-unviewed-count',
      clientId,
    });

    if (response.success && response.data) {
      return response.data.unviewedCount;
    }
  } catch (error) {
    console.warn('[getUnviewedMissedCallsCount] Error:', error);
  }

  return 0;
};
