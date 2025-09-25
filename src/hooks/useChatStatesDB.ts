import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ChatState {
  chatId: string;
  isPinned: boolean;
  isArchived: boolean;
  isUnread: boolean;
}

export const useChatStatesDB = () => {
  const [chatStates, setChatStates] = useState<Record<string, ChatState>>({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const busRef = useRef<any>(null);

  // Загрузка состояний чатов из базы данных
  const loadChatStates = useCallback(async () => {
    if (!user) {
      setChatStates({});
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('chat_states')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading chat states:', error);
        return;
      }

      const statesMap: Record<string, ChatState> = {};
      (data || []).forEach(state => {
        statesMap[state.chat_id] = {
          chatId: state.chat_id,
          isPinned: state.is_pinned,
          isArchived: state.is_archived,
          isUnread: state.is_unread
        };
      });

      setChatStates(statesMap);
    } catch (error) {
      console.error('Error loading chat states:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Загружаем данные при монтировании компонента или изменении пользователя
  useEffect(() => {
    loadChatStates();

    // Настройка реального времени для синхронизации состояний чатов
    if (user) {
      const channel = supabase
        .channel(`chat-states-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_states',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Personal chat state change:', payload);
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const newState = payload.new as any;
              setChatStates(prev => ({
                ...prev,
                [newState.chat_id]: {
                  chatId: newState.chat_id,
                  isPinned: newState.is_pinned,
                  isArchived: newState.is_archived,
                  isUnread: newState.is_unread
                }
              }));
            } else if (payload.eventType === 'DELETE') {
              const oldState = payload.old as any;
              setChatStates(prev => {
                const newStates = { ...prev };
                delete newStates[oldState.chat_id];
                return newStates;
              });
            }
          }
        )
        .subscribe();

      // Канал для уведомлений другим клиентам (межпользовательская синхронизация)
      const bus = supabase
        .channel('chat-states-bus')
        .subscribe();
      busRef.current = bus;

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(bus);
      };
    }
  }, [loadChatStates, user]);

  // Обновление состояния чата
  const updateChatState = useCallback(async (chatId: string, updates: Partial<Omit<ChatState, 'chatId'>>) => {
    if (!user) return;

    try {
      const currentState = chatStates[chatId] || { isPinned: false, isArchived: false, isUnread: false };
      const newState = { ...currentState, ...updates };

      // Upsert в базу данных
      const { error } = await supabase
        .from('chat_states')
        .upsert({
          user_id: user.id,
          chat_id: chatId,
          is_pinned: newState.isPinned,
          is_archived: newState.isArchived,
          is_unread: newState.isUnread
        }, {
          onConflict: 'user_id,chat_id'
        });

      if (error) {
        console.error('Error updating chat state:', error);
        return;
      }

      // Уведомляем других клиентов о смене статуса закрепления
      if (Object.prototype.hasOwnProperty.call(updates, 'isPinned')) {
        try {
          await busRef.current?.send({
            type: 'broadcast',
            event: 'pin-change',
            payload: { chatId, isPinned: newState.isPinned }
          });
          console.log('Broadcast pin change:', { chatId, isPinned: newState.isPinned });
        } catch (e) {
          console.warn('Broadcast failed', e);
        }
      }

      // Обновляем локальное состояние
      setChatStates(prev => ({
        ...prev,
        [chatId]: {
          chatId,
          ...newState
        }
      }));
    } catch (error) {
      console.error('Error updating chat state:', error);
    }
  }, [user, chatStates]);

  // Вспомогательные функции для удобства
  const togglePin = useCallback((chatId: string) => {
    const currentState = chatStates[chatId];
    updateChatState(chatId, { isPinned: !currentState?.isPinned });
  }, [chatStates, updateChatState]);

  const toggleArchive = useCallback((chatId: string) => {
    const currentState = chatStates[chatId];
    updateChatState(chatId, { isArchived: !currentState?.isArchived });
  }, [chatStates, updateChatState]);

  const markAsRead = useCallback((chatId: string) => {
    // Обновляем только персональные состояния (закрепленные, архивированные)
    // Прочитанность теперь глобальная и управляется через useGlobalChatReadStatus
    updateChatState(chatId, { isUnread: false });
  }, [updateChatState]);

  const markAsUnread = useCallback((chatId: string) => {
    updateChatState(chatId, { isUnread: true });
  }, [updateChatState]);

  // Получить состояние конкретного чата
  const getChatState = useCallback((chatId: string): ChatState => {
    return chatStates[chatId] || { 
      chatId, 
      isPinned: false, 
      isArchived: false, 
      isUnread: false 
    };
  }, [chatStates]);

  return {
    chatStates,
    loading,
    updateChatState,
    togglePin,
    toggleArchive,
    markAsRead,
    markAsUnread,
    getChatState
  };
};