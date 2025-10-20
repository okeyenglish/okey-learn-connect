import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export const useRealtimeClients = () => {
  const queryClient = useQueryClient();

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
          console.log('Client data changed:', payload);
          const affectedId = (payload.new && (payload.new as any).id) || (payload.old && (payload.old as any).id);
          
          // Invalidate all queries that depend on client data
          queryClient.invalidateQueries({ queryKey: ['clients'] });
          queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
          
          // Invalidate specific client query if we have an ID
          if (affectedId) {
            queryClient.invalidateQueries({ queryKey: ['client', affectedId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
