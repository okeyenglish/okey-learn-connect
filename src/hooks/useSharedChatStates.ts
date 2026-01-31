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
      const pinnedByMap = new Map<string, { user_id: string; user_name: string }>();

      // Create chunks
      const chunks: string[][] = [];
      for (let i = 0; i < currentChatIds.length; i += CHUNK_SIZE) {
        chunks.push(currentChatIds.slice(i, i + CHUNK_SIZE));
      }

      // PARALLEL: Fetch my states AND other pins for ALL chunks at once
      const [myStatesResults, otherPinsResults] = await Promise.all([
        // All myStates chunks in parallel
        Promise.all(chunks.map(chunk => 
          supabase
            .from('chat_states')
            .select('chat_id, is_pinned')
            .eq('user_id', user.id)
            .in('chat_id', chunk)
        )),
        // All otherPins chunks in parallel
        Promise.all(chunks.map(chunk =>
          supabase
            .from('chat_states')
            .select('chat_id, user_id')
            .eq('is_pinned', true)
            .neq('user_id', user.id)
            .in('chat_id', chunk)
        ))
      ]);

      // Process myStates results
      myStatesResults.forEach(result => {
        if (!result.error && result.data) {
          result.data.forEach((state: any) => {
            myStatesMap.set(state.chat_id, state.is_pinned);
          });
        }
      });

      // Process otherPins results and collect user IDs
      const otherUserIds = new Set<string>();
      const chatIdToUserIdMap = new Map<string, string>();
      
      otherPinsResults.forEach(result => {
        if (!result.error && result.data) {
          result.data.forEach((pin: any) => {
            otherUserIds.add(pin.user_id);
            if (!chatIdToUserIdMap.has(pin.chat_id)) {
              chatIdToUserIdMap.set(pin.chat_id, pin.user_id);
            }
          });
        }
      });

      // PARALLEL: Fetch all profiles at once
      const userNamesMap = new Map<string, string>();
      const userIdsArray = Array.from(otherUserIds);
      
      if (userIdsArray.length > 0) {
        const profileChunks: string[][] = [];
        for (let i = 0; i < userIdsArray.length; i += CHUNK_SIZE) {
          profileChunks.push(userIdsArray.slice(i, i + CHUNK_SIZE));
        }

        const profileResults = await Promise.all(
          profileChunks.map(chunk =>
            supabase
              .from('profiles')
              .select('id, first_name, last_name')
              .in('id', chunk)
          )
        );

        profileResults.forEach(result => {
          if (!result.error && result.data) {
            result.data.forEach((profile: any) => {
              const userName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Менеджер';
              userNamesMap.set(profile.id, userName);
            });
          }
        });
      }

      // Build pinnedByMap with names
      chatIdToUserIdMap.forEach((userId, chatId) => {
        const userName = userNamesMap.get(userId) || 'Менеджер';
        pinnedByMap.set(chatId, { user_id: userId, user_name: userName });
      });

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
