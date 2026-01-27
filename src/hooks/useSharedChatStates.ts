import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/typedClient";
import { useAuth } from "@/hooks/useAuth";

interface SharedChatState {
  chat_id: string;
  is_pinned: boolean;
  user_id: string;
  pinned_by_others: boolean;
  pinned_by_user_name?: string;
  pinned_by_user_id?: string;
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
      // Map: chat_id -> { user_id, user_name }
      const pinnedByMap = new Map<string, { user_id: string; user_name: string }>();

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

      // Получаем все закрепления других пользователей с именами - chunked
      for (let i = 0; i < currentChatIds.length; i += CHUNK_SIZE) {
        const chunk = currentChatIds.slice(i, i + CHUNK_SIZE);
        
        const { data: otherPins, error: pinsError } = await supabase
          .from('chat_states')
          .select(`
            chat_id,
            user_id,
            profiles!chat_states_user_id_fkey(first_name, last_name)
          `)
          .eq('is_pinned', true)
          .neq('user_id', user.id)
          .in('chat_id', chunk);

        if (pinsError) {
          console.error('Error fetching other users pins chunk:', pinsError);
          continue;
        }

        (otherPins || []).forEach((pin: any) => {
          const profile = pin.profiles;
          const userName = profile 
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Менеджер'
            : 'Менеджер';
          
          // Сохраняем первого закрепившего (если несколько)
          if (!pinnedByMap.has(pin.chat_id)) {
            pinnedByMap.set(pin.chat_id, { 
              user_id: pin.user_id, 
              user_name: userName 
            });
          }
        });
      }

      // Собираем итоговую карту только для запрошенных chatIds
      const chatStatesMap: Record<string, SharedChatState> = {};
      currentChatIds.forEach((chatId) => {
        const isPinnedByMe = myStatesMap.get(chatId) || false;
        const pinnedByOther = pinnedByMap.get(chatId);
        
        chatStatesMap[chatId] = {
          chat_id: chatId,
          is_pinned: isPinnedByMe,
          user_id: isPinnedByMe ? user.id : '',
          pinned_by_others: !!pinnedByOther,
          pinned_by_user_name: pinnedByOther?.user_name,
          pinned_by_user_id: pinnedByOther?.user_id
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
    return state?.pinned_by_user_name || '';
  };

  const getPinnedByUserId = (chatId: string): string | undefined => {
    const state = sharedStates[chatId];
    return state?.pinned_by_user_id;
  };

  return {
    isInWorkByOthers,
    isPinnedByCurrentUser,
    isPinnedByAnyone,
    getPinnedByUserName,
    getPinnedByUserId,
    isLoading
  };
};

export default useSharedChatStates;
