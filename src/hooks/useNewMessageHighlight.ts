import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const HIGHLIGHT_DURATION_MS = 3000; // Время показа подсветки (совпадает с CSS анимацией)

/**
 * Хук для отслеживания новых входящих сообщений и создания временной подсветки
 * в списке чатов. Подсветка автоматически снимается через 3 секунды.
 */
export function useNewMessageHighlight() {
  const [newMessageClientIds, setNewMessageClientIds] = useState<Set<string>>(new Set());
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Добавляем клиента в список "новых сообщений" с автоматическим удалением
  const addNewMessageHighlight = useCallback((clientId: string) => {
    // Очищаем предыдущий таймаут если был
    const existingTimeout = timeoutsRef.current.get(clientId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Добавляем в set
    setNewMessageClientIds(prev => {
      const next = new Set(prev);
      next.add(clientId);
      return next;
    });

    // Устанавливаем таймаут для удаления
    const timeout = setTimeout(() => {
      setNewMessageClientIds(prev => {
        const next = new Set(prev);
        next.delete(clientId);
        return next;
      });
      timeoutsRef.current.delete(clientId);
    }, HIGHLIGHT_DURATION_MS);

    timeoutsRef.current.set(clientId, timeout);
  }, []);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      timeoutsRef.current.clear();
    };
  }, []);

  // Подписка на realtime обновления chat_messages
  useEffect(() => {
    const channel = supabase
      .channel('new-message-highlight')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages',
          filter: 'direction=eq.incoming'
        },
        (payload) => {
          const clientId = payload.new?.client_id;
          if (clientId) {
            addNewMessageHighlight(clientId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [addNewMessageHighlight]);

  return {
    newMessageClientIds,
    addNewMessageHighlight,
  };
}
