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
    // Poll every 30 seconds for client changes
    const pollInterval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
    }, 30000);

    return () => {
      clearInterval(pollInterval);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [queryClient]);
};
