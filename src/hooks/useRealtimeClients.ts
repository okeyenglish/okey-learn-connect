import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export const useRealtimeClients = () => {
  const queryClient = useQueryClient();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingRefetchRef = useRef(false);
  const eventCountRef = useRef(0);

  const debouncedRefetch = useCallback(() => {
    // Mark that we need a refetch
    pendingRefetchRef.current = true;
    eventCountRef.current += 1;
    
    // Clear existing timer and set a new one
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Wait 2 seconds after the last event before refetching
    debounceTimerRef.current = setTimeout(() => {
      if (pendingRefetchRef.current) {
        console.log(`🔄 Debounced refetch triggered (${eventCountRef.current} events batched)`);
        queryClient.refetchQueries({ queryKey: ['clients'] });
        queryClient.refetchQueries({ queryKey: ['chat-threads'] });
        pendingRefetchRef.current = false;
        eventCountRef.current = 0;
      }
      debounceTimerRef.current = null;
    }, 2000); // 2 second debounce
  }, [queryClient]);

  useEffect(() => {
    const channel = supabase
      .channel('clients-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients'
        },
        (payload) => {
          const affectedId = (payload.new && (payload.new as any).id) || (payload.old && (payload.old as any).id);
          
          // Use debounced refetch for bulk operations
          debouncedRefetch();
          
          // Refetch specific client query immediately if we have an ID
          if (affectedId) {
            queryClient.refetchQueries({ queryKey: ['client', affectedId] });
          }
        }
      )
      .subscribe();

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [queryClient, debouncedRefetch]);
};
