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
        // Получаем все закрепленные чаты всех пользователей
        const { data: allPinnedChats, error } = await supabase
          .from('chat_states')
          .select('chat_id, user_id, is_pinned')
          .eq('is_pinned', true);

        if (error) {
          console.error('Error fetching shared chat states:', error);
          return;
        }

        // Получаем информацию о пользователях отдельным запросом
        const userIds = [...new Set(allPinnedChats?.map(chat => chat.user_id) || [])];
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        // Создаем карту профилей для быстрого доступа
        const profilesMap = new Map();
        profilesData?.forEach(profile => {
          profilesMap.set(profile.id, profile);
        });

        // Группируем по chat_id
        const chatStatesMap: Record<string, SharedChatState> = {};
        
        allPinnedChats?.forEach(state => {
          const chatId = state.chat_id;
          const profile = profilesMap.get(state.user_id);
          const userName = profile ? 
            `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 
            profile.email?.split('@')[0] || 'Пользователь' 
            : 'Неизвестный пользователь';
          
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
              if (!chatStatesMap[chatId].pinned_by_user_name) {
                chatStatesMap[chatId].pinned_by_user_name = userName;
              }
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

    // Подписываемся на изменения в chat_states для синхронизации между пользователями
    const channel = supabase
      .channel('shared-chat-states-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'chat_states' }, 
        (payload) => {
          console.log('Shared chat states changed, refetching...', payload);
          // Перезагружаем состояния при любых изменениях от других пользователей
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

export default useSharedChatStates;