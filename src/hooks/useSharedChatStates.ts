import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/typedClient";
import { useAuth } from "@/hooks/useAuth";

interface SharedChatState {
  chat_id: string;
  is_pinned: boolean;
  user_id: string;
  pinned_by_others: boolean;
  pinned_by_user_name?: string;
}

export const useSharedChatStates = (chatIds: string[] = []) => {
  const [sharedStates, setSharedStates] = useState<Record<string, SharedChatState>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  
  // Stabilize chatIds to prevent infinite loops - use sorted string as key
  const chatIdsKey = useMemo(() => {
    if (!chatIds || chatIds.length === 0) return '';
    return [...chatIds].sort().join(',');
  }, [chatIds]);
  
  // Debounce ref for realtime updates
  const debouncedFetchRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSharedStates = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const currentChatIds = chatIdsKey ? chatIdsKey.split(',') : [];
    
    if (currentChatIds.length === 0) {
      setSharedStates({});
      setIsLoading(false);
      return;
    }

    try {
      // Chunk the IDs to avoid URL length limits (max ~100 IDs per request)
      const CHUNK_SIZE = 100;
      const myStatesMap = new Map<string, boolean>();
      const countMap = new Map<string, number>();

      // Мои состояния чатов - chunked
      for (let i = 0; i < currentChatIds.length; i += CHUNK_SIZE) {
        const chunk = currentChatIds.slice(i, i + CHUNK_SIZE);
        
        const { data: myStates, error: myStatesError } = await supabase
          .from('chat_states')
          .select('chat_id, is_pinned')
          .eq('user_id', user.id)
          .in('chat_id', chunk);

        if (myStatesError) {
          console.error('Error fetching my chat states chunk:', myStatesError);
          continue;
        }

        (myStates || []).forEach((state: any) => {
          myStatesMap.set(state.chat_id, state.is_pinned);
        });
      }

      // Глобальный счетчик закреплений по чату - chunked
      for (let i = 0; i < currentChatIds.length; i += CHUNK_SIZE) {
        const chunk = currentChatIds.slice(i, i + CHUNK_SIZE);
        
        const { data: counts, error: countsError } = await supabase.rpc('get_chat_pin_counts', {
          _chat_ids: chunk
        });

        if (countsError) {
          console.error('Error fetching shared pin counts chunk:', countsError);
          continue;
        }

        (counts || []).forEach((row: any) => countMap.set(row.chat_id, row.pin_count));
      }

      // Собираем итоговую карту только для запрошенных chatIds
      const chatStatesMap: Record<string, SharedChatState> = {};
      currentChatIds.forEach((chatId) => {
        const isPinnedByMe = myStatesMap.get(chatId) || false;
        const totalPins = countMap.get(chatId) || 0;
        chatStatesMap[chatId] = {
          chat_id: chatId,
          is_pinned: isPinnedByMe,
          user_id: isPinnedByMe ? user.id : '',
          pinned_by_others: totalPins > 0 && !isPinnedByMe,
          pinned_by_user_name: undefined
        };
      });

      setSharedStates(chatStatesMap);
    } catch (error) {
      console.error('Error in fetchSharedStates:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, chatIdsKey]);
  
  // Debounced fetch for realtime updates - prevents request floods
  const debouncedFetch = useCallback(() => {
    if (debouncedFetchRef.current) {
      clearTimeout(debouncedFetchRef.current);
    }
    debouncedFetchRef.current = setTimeout(() => {
      fetchSharedStates();
    }, 2000); // 2 second debounce
  }, [fetchSharedStates]);

  useEffect(() => {
    if (!user?.id || !chatIdsKey) {
      setIsLoading(false);
      return;
    }

    fetchSharedStates();

    // Подписываемся на изменения в chat_states с debounce
    const changesChannel = supabase
      .channel('shared-chat-states-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'chat_states' }, 
        () => {
          console.log('Shared chat states changed, debounced refetch...');
          debouncedFetch();
        }
      )
      .subscribe();

    // Доп. канал вещания для межпользовательской синхронизации
    const busChannel = supabase
      .channel('chat-states-bus')
      .on('broadcast', { event: 'pin-change' }, () => {
        console.log('Broadcast pin-change received, debounced refetch...');
        debouncedFetch();
      })
      .subscribe();

    return () => {
      if (debouncedFetchRef.current) {
        clearTimeout(debouncedFetchRef.current);
      }
      supabase.removeChannel(changesChannel);
      supabase.removeChannel(busChannel);
    };
  }, [user?.id, chatIdsKey, fetchSharedStates, debouncedFetch]);

  const isInWorkByOthers = (chatId: string): boolean => {
    const state = sharedStates[chatId];
    return state ? state.pinned_by_others && !state.is_pinned : false;
  };

  const isPinnedByCurrentUser = (chatId: string): boolean => {
    const state = sharedStates[chatId];
    return state ? state.is_pinned : false;
  };

  const isPinnedByAnyone = (chatId: string): boolean => {
    const state = sharedStates[chatId];
    return state ? (state.is_pinned || state.pinned_by_others) : false;
  };

  const getPinnedByUserName = (chatId: string): string => {
    const state = sharedStates[chatId];
    return state?.pinned_by_user_name || 'Неизвестный пользователь';
  };

  return {
    isInWorkByOthers,
    isPinnedByCurrentUser,
    isPinnedByAnyone,
    getPinnedByUserName,
    isLoading
  };
};

export default useSharedChatStates;
