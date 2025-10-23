import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Оптимизированный real-time хук с батчингом и throttling
 */

interface UseRealtimeOptimizedOptions {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  onUpdate?: () => void;
  batchDelay?: number; // Задержка для батчинга (мс)
  enabled?: boolean;
}

export function useRealtimeOptimized({
  table,
  event = '*',
  filter,
  onUpdate,
  batchDelay = 300,
  enabled = true,
}: UseRealtimeOptimizedOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef(0);

  // Батчинг обновлений для снижения нагрузки
  const triggerBatchedUpdate = useCallback(() => {
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
    }

    pendingUpdatesRef.current += 1;

    batchTimerRef.current = setTimeout(() => {
      if (pendingUpdatesRef.current > 0 && onUpdate) {
        console.log(`[Realtime] Batch update: ${pendingUpdatesRef.current} changes on ${table}`);
        onUpdate();
        pendingUpdatesRef.current = 0;
      }
    }, batchDelay);
  }, [onUpdate, batchDelay, table]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Создаем уникальное имя канала
    const channelName = `optimized-${table}-${Date.now()}`;
    
    const config: any = {
      event,
      schema: 'public',
      table,
    };

    if (filter) {
      config.filter = filter;
    }

    channelRef.current = supabase
      .channel(channelName)
      .on('postgres_changes', config, (payload) => {
        console.log(`[Realtime] Change detected on ${table}:`, payload.eventType);
        triggerBatchedUpdate();
      })
      .subscribe();

    console.log(`[Realtime] Subscribed to ${table} with batching (${batchDelay}ms)`);

    return () => {
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        console.log(`[Realtime] Unsubscribed from ${table}`);
      }
    };
  }, [table, event, filter, enabled, triggerBatchedUpdate, batchDelay]);
}

/**
 * Хук для подписки на несколько таблиц с одним каналом
 */
interface MultiTableSubscription {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
}

export function useRealtimeMultiTable(
  subscriptions: MultiTableSubscription[],
  onUpdate?: () => void,
  options: { batchDelay?: number; enabled?: boolean } = {}
) {
  const { batchDelay = 500, enabled = true } = options;
  const channelRef = useRef<RealtimeChannel | null>(null);
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<Map<string, number>>(new Map());

  const triggerBatchedUpdate = useCallback(() => {
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
    }

    batchTimerRef.current = setTimeout(() => {
      if (pendingUpdatesRef.current.size > 0 && onUpdate) {
        const changes = Array.from(pendingUpdatesRef.current.entries())
          .map(([table, count]) => `${table}(${count})`)
          .join(', ');
        console.log(`[Realtime] Multi-table batch update:`, changes);
        onUpdate();
        pendingUpdatesRef.current.clear();
      }
    }, batchDelay);
  }, [onUpdate, batchDelay]);

  useEffect(() => {
    if (!enabled || subscriptions.length === 0) {
      return;
    }

    const channelName = `multi-table-${Date.now()}`;
    let channel = supabase.channel(channelName);

    subscriptions.forEach(({ table, event = '*', filter }) => {
      const config: any = {
        event,
        schema: 'public',
        table,
      };

      if (filter) {
        config.filter = filter;
      }

      channel = channel.on('postgres_changes', config, (payload) => {
        const currentCount = pendingUpdatesRef.current.get(table) || 0;
        pendingUpdatesRef.current.set(table, currentCount + 1);
        triggerBatchedUpdate();
      });
    });

    channelRef.current = channel.subscribe();

    const tables = subscriptions.map(s => s.table).join(', ');
    console.log(`[Realtime] Multi-table subscription: ${tables}`);

    return () => {
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        console.log(`[Realtime] Unsubscribed from multi-table channel`);
      }
    };
  }, [subscriptions, enabled, triggerBatchedUpdate]);
}

/**
 * Хук для presence (онлайн статус пользователей) с оптимизацией
 */
export function usePresenceOptimized(
  roomId: string,
  userState: any,
  options: { enabled?: boolean; throttle?: number } = {}
) {
  const { enabled = true, throttle = 5000 } = options;
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const channel = supabase.channel(roomId);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log(`[Presence] Sync in ${roomId}:`, Object.keys(state).length, 'users');
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log(`[Presence] User joined ${roomId}:`, key);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log(`[Presence] User left ${roomId}:`, key);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Throttling для track - не чаще чем раз в N секунд
          const now = Date.now();
          if (now - lastUpdateRef.current >= throttle) {
            await channel.track(userState);
            lastUpdateRef.current = now;
            console.log(`[Presence] Tracked state in ${roomId}`);
          }
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        console.log(`[Presence] Unsubscribed from ${roomId}`);
      }
    };
  }, [roomId, enabled, throttle, userState]);

  return channelRef.current;
}
