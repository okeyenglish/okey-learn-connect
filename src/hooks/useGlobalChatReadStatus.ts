import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from './useAuth';

interface GlobalReadStatus {
  chatId: string;
  lastReadAt: string;
  lastReadBy: string;
}

export const useGlobalChatReadStatus = () => {
  const [globalReadStatuses, setGlobalReadStatuses] = useState<Record<string, GlobalReadStatus>>({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Загрузка глобальных состояний прочитанности
  const loadGlobalReadStatuses = useCallback(async () => {
    if (!user) {
      setGlobalReadStatuses({});
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('global_chat_read_status')
        .select('*');

      if (error) {
        console.error('Error loading global read statuses:', error);
        return;
      }

      const statusesMap: Record<string, GlobalReadStatus> = {};
      (data || []).forEach(status => {
        statusesMap[status.chat_id] = {
          chatId: status.chat_id,
          lastReadAt: status.last_read_at,
          lastReadBy: status.last_read_by
        };
      });

      setGlobalReadStatuses(statusesMap);
    } catch (error) {
      console.error('Error loading global read statuses:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Загружаем данные при монтировании
  useEffect(() => {
    loadGlobalReadStatuses();

    // Настройка реального времени для синхронизации глобальных состояний
    if (user) {
      const channel = supabase
        .channel('global-read-status-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'global_chat_read_status'
          },
          (payload) => {
            console.log('Global read status change:', payload);
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const newStatus = payload.new as any;
              setGlobalReadStatuses(prev => ({
                ...prev,
                [newStatus.chat_id]: {
                  chatId: newStatus.chat_id,
                  lastReadAt: newStatus.last_read_at,
                  lastReadBy: newStatus.last_read_by
                }
              }));
            } else if (payload.eventType === 'DELETE') {
              const oldStatus = payload.old as any;
              setGlobalReadStatuses(prev => {
                const newStatuses = { ...prev };
                delete newStatuses[oldStatus.chat_id];
                return newStatuses;
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [loadGlobalReadStatuses, user]);

  // Пометить чат как прочитанный глобально
  const markChatAsReadGlobally = useCallback(async (chatId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('global_chat_read_status')
        .upsert({
          chat_id: chatId,
          last_read_at: new Date().toISOString(),
          last_read_by: user.id
        }, {
          onConflict: 'chat_id'
        });

      if (error) {
        console.error('Error marking chat as read globally:', error);
        return;
      }

      // Обновляем локальное состояние
      setGlobalReadStatuses(prev => ({
        ...prev,
        [chatId]: {
          chatId,
          lastReadAt: new Date().toISOString(),
          lastReadBy: user.id
        }
      }));
    } catch (error) {
      console.error('Error marking chat as read globally:', error);
    }
  }, [user]);

  // Получить глобальное состояние прочитанности чата
  const getGlobalReadStatus = useCallback((chatId: string): GlobalReadStatus | null => {
    return globalReadStatuses[chatId] || null;
  }, [globalReadStatuses]);

  // Проверить прочитан ли чат глобально (сравнивая с временем последнего сообщения)
  const isChatReadGlobally = useCallback((chatId: string, lastMessageTime?: string): boolean => {
    const status = globalReadStatuses[chatId];
    if (!status) return false;
    
    if (!lastMessageTime) return true; // Если нет времени сообщения, считаем прочитанным
    
    const lastReadTime = new Date(status.lastReadAt).getTime();
    const messageTime = new Date(lastMessageTime).getTime();
    
    return lastReadTime >= messageTime;
  }, [globalReadStatuses]);

  return {
    globalReadStatuses,
    loading,
    markChatAsReadGlobally,
    getGlobalReadStatus,
    isChatReadGlobally
  };
};