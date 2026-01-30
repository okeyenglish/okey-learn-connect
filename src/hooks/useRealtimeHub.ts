/**
 * RealtimeHub - Централизованный хаб для управления всеми realtime подписками
 * 
 * Консолидирует множество WebSocket подписок в одну для:
 * - tasks
 * - lesson_sessions
 * - chat_states
 * 
 * Это уменьшает количество WebSocket соединений с ~20 до 3-5
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from '@/hooks/useAuth';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface TableSubscription {
  table: string;
  event: RealtimeEvent;
  filter?: string;
  onPayload?: (payload: any) => void;
}

// Определяем таблицы для консолидированной подписки
const CONSOLIDATED_TABLES: TableSubscription[] = [
  {
    table: 'tasks',
    event: '*',
  },
  {
    table: 'lesson_sessions',
    event: '*',
  },
  {
    table: 'chat_states',
    event: '*',
  },
];

/**
 * Хук для централизованного управления realtime подписками
 * Использует одно WebSocket соединение для нескольких таблиц
 */
export function useRealtimeHub() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isSubscribedRef = useRef(false);

  // Invalidation handlers для каждой таблицы
  const handleTasksChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['tasks-by-date'] });
  }, [queryClient]);

  const handleLessonSessionsChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['lesson-sessions'] });
    queryClient.invalidateQueries({ queryKey: ['schedule'] });
    queryClient.invalidateQueries({ queryKey: ['teacher-schedule'] });
  }, [queryClient]);

  const handleChatStatesChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['chat-states'] });
    queryClient.invalidateQueries({ queryKey: ['pinned-chat-ids'] });
  }, [queryClient]);

  // Создание и подписка на канал
  const createChannel = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (!user?.id) return;

    console.log('[RealtimeHub] 🔌 Creating consolidated channel...');

    const channel = supabase
      .channel('realtime-hub-' + Date.now())
      // Tasks
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          console.log('[RealtimeHub] 📨 Tasks change:', payload.eventType);
          handleTasksChange();
        }
      )
      // Lesson sessions
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lesson_sessions',
        },
        (payload) => {
          console.log('[RealtimeHub] 📨 Lesson sessions change:', payload.eventType);
          handleLessonSessionsChange();
        }
      )
      // Chat states
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_states',
        },
        (payload) => {
          console.log('[RealtimeHub] 📨 Chat states change:', payload.eventType);
          handleChatStatesChange();
        }
      )
      .subscribe((status) => {
        console.log('[RealtimeHub] 📡 Channel status:', status);
        
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
          console.log('[RealtimeHub] ✅ Successfully subscribed to consolidated realtime');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          isSubscribedRef.current = false;
          console.error('[RealtimeHub] ❌ Channel error/timeout');
        }
      });

    channelRef.current = channel;
  }, [user?.id, handleTasksChange, handleLessonSessionsChange, handleChatStatesChange]);

  // Инициализация и очистка
  useEffect(() => {
    if (!user?.id) return;
    
    if (isSubscribedRef.current || channelRef.current) {
      console.log('[RealtimeHub] Already subscribed, skipping');
      return;
    }

    createChannel();

    return () => {
      console.log('[RealtimeHub] 🔌 Cleaning up channel');
      isSubscribedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, createChannel]);

  // Reconnect при восстановлении соединения
  useEffect(() => {
    const handleOnline = () => {
      console.log('[RealtimeHub] 🌐 Browser is online, reconnecting...');
      if (!isSubscribedRef.current) {
        createChannel();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [createChannel]);

  return {
    isConnected: isSubscribedRef.current,
  };
}

/**
 * Провайдер для использования RealtimeHub на уровне приложения
 * Используйте в CRM.tsx для активации централизованных подписок
 */
export function RealtimeHubProvider({ children }: { children: React.ReactNode }) {
  useRealtimeHub();
  return children;
}
