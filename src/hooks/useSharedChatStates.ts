import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const fetchSharedStates = async () => {
      try {
        if (!chatIds || chatIds.length === 0) {
          setSharedStates({});
          return;
        }

        // Мои закрепленные чаты (разрешено RLS)
        const { data: myPins, error: myPinsError } = await supabase
          .from('chat_states')
          .select('chat_id, is_pinned')
          .eq('user_id', user.id)
          .eq('is_pinned', true);

        if (myPinsError) {
          console.error('Error fetching my pins:', myPinsError);
        }

        const myPinnedSet = new Set((myPins || []).map((p: any) => p.chat_id));

        // Глобальный счетчик закреплений по чату (SECURITY DEFINER функция)
        const { data: counts, error: countsError } = await supabase.rpc('get_chat_pin_counts', {
          _chat_ids: chatIds
        });

        if (countsError) {
          console.error('Error fetching shared pin counts:', countsError);
        }

        const countMap = new Map<string, number>();
        (counts || []).forEach((row: any) => countMap.set(row.chat_id, row.pin_count));

        // Собираем итоговую карту
        const chatStatesMap: Record<string, SharedChatState> = {};
        chatIds.forEach((chatId) => {
          const isPinnedByMe = myPinnedSet.has(chatId);
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
    };

    fetchSharedStates();

    // Подписываемся на изменения в chat_states для синхронизации между пользователями
    const channel = supabase
      .channel('shared-chat-states-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'chat_states' }, 
        (payload) => {
          console.log('Shared chat states changed, refetching...', payload);
          fetchSharedStates();
        }
      )
      .on('broadcast', { event: 'pin-change' }, () => {
        console.log('Broadcast pin-change received, refetching...');
        fetchSharedStates();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

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