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

export const useSharedChatStates = () => {
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
        // Получаем все закрепленные чаты всех пользователей с информацией о пользователях
        const { data: allPinnedChats, error } = await supabase
          .from('chat_states')
          .select(`
            chat_id, 
            user_id, 
            is_pinned,
            profiles!inner(first_name, last_name)
          `)
          .eq('is_pinned', true);

        if (error) {
          console.error('Error fetching shared chat states:', error);
          return;
        }

        // Группируем по chat_id
        const chatStatesMap: Record<string, SharedChatState> = {};
        
        allPinnedChats?.forEach(state => {
          const chatId = state.chat_id;
          const profile = state.profiles as any;
          const userName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Неизвестный пользователь';
          
          if (!chatStatesMap[chatId]) {
            chatStatesMap[chatId] = {
              chat_id: chatId,
              is_pinned: state.user_id === user.id,
              user_id: state.user_id === user.id ? state.user_id : '',
              pinned_by_others: state.user_id !== user.id,
              pinned_by_user_name: state.user_id !== user.id ? userName : undefined
            };
          } else {
            // Если чат уже есть в карте, обновляем флаги
            if (state.user_id === user.id) {
              chatStatesMap[chatId].is_pinned = true;
              chatStatesMap[chatId].user_id = state.user_id;
            } else {
              chatStatesMap[chatId].pinned_by_others = true;
              chatStatesMap[chatId].pinned_by_user_name = userName;
            }
          }
        });

        console.log('Shared chat states:', chatStatesMap);
        setSharedStates(chatStatesMap);
      } catch (error) {
        console.error('Error in fetchSharedStates:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSharedStates();

    // Подписываемся на изменения в chat_states
    const channel = supabase
      .channel('shared-chat-states')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'chat_states' }, 
        () => {
          console.log('Chat states changed, refetching...');
          fetchSharedStates();
        }
      )
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