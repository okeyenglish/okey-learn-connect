import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from './useAuth';
import type { ChatState } from '@/integrations/supabase/database.types';

interface ChatStateRow {
  chat_id: string;
  is_pinned: boolean;
}

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
      const { data, error } = await supabase
        .from('chat_states')
        .select('chat_id')
        .eq('user_id', user.id)
        .eq('is_pinned', true);

      if (error) {
        console.error('Error loading pinned chat IDs:', error);
        return;
      }

      const rows = (data || []) as ChatStateRow[];
      setPinnedChatIds(rows.map((d) => d.chat_id));
    } catch (error) {
      console.error('Error loading pinned chat IDs:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPinnedChatIds();
    // Removed: postgres_changes subscription for chat_states
    // useRealtimeHub already handles query invalidation for 'chat_states' table
    // We use refetchInterval as lightweight backup
  }, [loadPinnedChatIds, user]);

  return { pinnedChatIds, loading, refetch: loadPinnedChatIds };
};
