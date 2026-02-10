import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from './useAuth';
import type { GlobalChatReadStatus } from '@/integrations/supabase/database.types';

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

  // Загружаем данные при монтировании и используем polling вместо realtime
  useEffect(() => {
    loadGlobalReadStatuses();

    // Polling every 15 seconds instead of postgres_changes channel
    // Read status doesn't need sub-second latency
    if (!user) return;

    const pollInterval = setInterval(() => {
      loadGlobalReadStatuses();
    }, 15000);

    return () => {
      clearInterval(pollInterval);
    };
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
