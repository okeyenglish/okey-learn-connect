import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from './useAuth';

/**
 * Hook to fetch pinned chat IDs for the current user.
 * This ensures pinned chats are always included in visibleChatIds
 * even if they're not in the first 200 threads.
 */
export const usePinnedChatIds = () => {
  const [pinnedChatIds, setPinnedChatIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadPinnedChatIds = useCallback(async () => {
    if (!user) {
      setPinnedChatIds([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await (supabase
        .from('chat_states' as any) as any)
        .select('chat_id')
        .eq('user_id', user.id)
        .eq('is_pinned', true);

      if (error) {
        console.error('Error loading pinned chat IDs:', error);
        return;
      }

      setPinnedChatIds((data || []).map((d: any) => d.chat_id));
    } catch (error) {
      console.error('Error loading pinned chat IDs:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPinnedChatIds();

    // Subscribe to changes
    if (user) {
      const channel = supabase
        .channel(`pinned-chat-ids-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_states',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const newState = payload.new as any;
              if (newState.is_pinned) {
                setPinnedChatIds(prev => 
                  prev.includes(newState.chat_id) ? prev : [...prev, newState.chat_id]
                );
              } else {
                setPinnedChatIds(prev => prev.filter(id => id !== newState.chat_id));
              }
            } else if (payload.eventType === 'DELETE') {
              const oldState = payload.old as any;
              setPinnedChatIds(prev => prev.filter(id => id !== oldState.chat_id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [loadPinnedChatIds, user]);

  return { pinnedChatIds, loading, refetch: loadPinnedChatIds };
};
