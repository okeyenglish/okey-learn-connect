import { useState, useEffect, useCallback, useRef } from 'react';
import { onMessageEvent, offMessageEvent } from './useOrganizationRealtimeMessages';
import type { ChatMessagePayload } from './useOrganizationRealtimeMessages';

const HIGHLIGHT_DURATION_MS = 3000; // Время показа подсветки (совпадает с CSS анимацией)

/**
 * Хук для отслеживания новых входящих сообщений и создания временной подсветки
 * в списке чатов. Подсветка автоматически снимается через 3 секунды.
 * 
 * Uses the callback registry from useOrganizationRealtimeMessages instead of
 * creating its own postgres_changes channel.
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

  // Subscribe to message events via callback registry (no new postgres_changes channel)
  useEffect(() => {
    const handleMessageEvent = (msg: ChatMessagePayload, eventType: string) => {
      if (eventType !== 'INSERT') return;
      
      // Only highlight incoming messages
      // Self-hosted: message_type === 'client' or is_outgoing === false
      // Cloud: direction === 'incoming'
      const isIncoming = msg.message_type === 'client' || msg.is_outgoing === false || msg.direction === 'incoming';
      if (!isIncoming) return;

      const clientId = msg.client_id;
      if (clientId) {
        addNewMessageHighlight(clientId);
      }
    };

    onMessageEvent(handleMessageEvent);
    return () => {
      offMessageEvent(handleMessageEvent);
    };
  }, [addNewMessageHighlight]);

  return {
    newMessageClientIds,
    addNewMessageHighlight,
  };
}
