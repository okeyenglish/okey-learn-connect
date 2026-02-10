import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook for polling client changes instead of using postgres_changes channel.
 * Polls every 30 seconds and debounces rapid refetches.
 * This reduces WAL decoding overhead on the server.
 */
export const useRealtimeClients = () => {
  const queryClient = useQueryClient();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Poll every 120 seconds (2 min) for client changes — reduced from 30s to lower DB load
    const pollInterval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads-unread-priority'] });
    }, 120000);

    return () => {
      clearInterval(pollInterval);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [queryClient]);
};
