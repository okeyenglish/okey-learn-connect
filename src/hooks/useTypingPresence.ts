import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import type { TypingStatus } from '@/integrations/supabase/database.types';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { performanceAnalytics } from '@/utils/performanceAnalytics';

export interface TypingPresence {
  count: number;
  names: string[];
  draftText?: string | null;
  /** internal helper: map of user_id -> manager_name */
  users?: Record<string, string>;
}

type TypingStatusRow = Pick<TypingStatus, 'user_id' | 'client_id' | 'is_typing' | 'updated_at'> & {
  manager_name?: string | null;
  draft_text?: string | null;
};

// Soft typing sound (shorter/quieter than message notification)
const TYPING_SOUND_BASE64 = 
  'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYb/////////////////////////////////';

let typingSoundAudio: HTMLAudioElement | null = null;
let lastTypingSoundTime = 0;
const TYPING_SOUND_INTERVAL = 3000; // Play at most once per 3 seconds

const playTypingSound = () => {
  // Check if typing sound is enabled in settings
  try {
    const stored = localStorage.getItem('notification_settings');
    if (stored) {
      const settings = JSON.parse(stored);
      if (settings.soundEnabled === false) {
        return; // Sound is disabled globally
      }
    }
  } catch {
    // Ignore parsing errors
  }

  const now = Date.now();
  if (now - lastTypingSoundTime < TYPING_SOUND_INTERVAL) {
    return; // Throttle
  }

  try {
    if (!typingSoundAudio) {
      typingSoundAudio = new Audio(TYPING_SOUND_BASE64);
    }
    typingSoundAudio.volume = 0.2; // Quieter than message sounds
    lastTypingSoundTime = now;
    typingSoundAudio.currentTime = 0;
    typingSoundAudio.play().catch(() => {
      // Silently fail if autoplay is blocked
    });
  } catch {
    // Audio not supported
  }
};

// Tracks typing presence across all clients for chat lists
// OPTIMIZED: Uses payload directly instead of refresh() SELECT queries
export const useTypingPresence = () => {
  const [typingByClient, setTypingByClient] = useState<Record<string, TypingPresence>>({});
  const prevTypingCountRef = useRef<number>(0);

  // Fallback polling: keep list accurate if realtime is unstable
  const realtimeWorkingRef = useRef(false);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Consider typing stale after 10s (prevents stuck indicators if a tab closes mid-typing)
  const TYPING_TTL_MS = 10_000;

  // Initial fetch on mount
  const fetchCurrentPresence = useCallback(async () => {
    const start = performance.now();
    const cutoff = new Date(Date.now() - TYPING_TTL_MS).toISOString();
    const { data, error } = await supabase
      .from('typing_status')
      .select('client_id,user_id,is_typing,manager_name,updated_at')
      .eq('is_typing', true)
      .gt('updated_at', cutoff);
    
    if (error) {
      console.error('[useTypingPresence] Initial fetch error:', error);
      return;
    }
    
    // Track query for analytics
    performanceAnalytics.trackQuery({
      table: 'typing_status',
      operation: 'SELECT',
      duration: performance.now() - start,
      source: 'useTypingPresence',
      rowCount: data?.length,
    });
    
    const map: Record<string, TypingPresence & { drafts?: Record<string, string> }> = {};
    (data || []).forEach((r: TypingStatusRow) => {
      if (!r.is_typing) return;
      const key = r.client_id;
      const name = r.manager_name || 'Менеджер';
      if (!map[key]) map[key] = { count: 0, names: [], users: {}, drafts: {} };
      const users = map[key].users || {};
      const drafts = map[key].drafts || {};
      users[r.user_id] = name;
      if (r.draft_text) {
        drafts[r.user_id] = r.draft_text;
      }
      map[key].users = users;
      map[key].drafts = drafts;
    });

    Object.keys(map).forEach((clientId) => {
      const users = map[clientId].users || {};
      const drafts = map[clientId].drafts || {};
      const names = Array.from(new Set(Object.values(users)));
      // Get the first draft text (most recent typing user)
      const draftText = Object.values(drafts)[0] || null;
      map[clientId] = {
        ...map[clientId],
        count: Object.keys(users).length,
        names,
        draftText,
      };
    });
    setTypingByClient(map);
  }, []);

  // Handle realtime payload directly - NO additional SELECT queries
  const handleRealtimePayload = useCallback((
    payload: RealtimePostgresChangesPayload<TypingStatusRow>
  ) => {
    const eventType = payload.eventType;
    const record = (payload.new || payload.old) as TypingStatusRow | undefined;
    
    if (!record) return;
    
    const clientId = record.client_id;
    const userId = record.user_id;
    const isTyping = record.is_typing;
    const managerName = record.manager_name || 'Менеджер';
    const draftText = record.draft_text || null;

    // Drop stale typing
    const isFresh = !!record.updated_at && (Date.now() - new Date(record.updated_at).getTime() <= TYPING_TTL_MS);
    const shouldRemove = eventType === 'DELETE' || !isTyping || !isFresh;

    setTypingByClient(prev => {
      const updated = { ...prev };

      const current = updated[clientId] || { count: 0, names: [], users: {}, draftText: null };
      const users = { ...(current.users || {}) };
      const wasUserTyping = !!users[userId];

      if (shouldRemove) {
        delete users[userId];
      } else {
        users[userId] = managerName;
      }

      const names = Array.from(new Set(Object.values(users)));
      const count = Object.keys(users).length;

      // Play sound when a NEW user starts typing (not on draft updates)
      if (!shouldRemove && !wasUserTyping && isTyping) {
        playTypingSound();
      }

      if (count <= 0) {
        delete updated[clientId];
      } else {
        // Use the latest draft text from the updating user
        updated[clientId] = { 
          count, 
          names, 
          users, 
          draftText: shouldRemove ? (current.draftText || null) : (draftText || current.draftText || null),
        };
      }
      
      return updated;
    });
  }, []);

  useEffect(() => {
    // Reset for new mount
    realtimeWorkingRef.current = false;

    // Initial fetch
    fetchCurrentPresence();

    // Start fallback polling (stops after first realtime event)
    pollingIntervalRef.current = setInterval(() => {
      if (!realtimeWorkingRef.current) {
        fetchCurrentPresence();
      }
    }, 2000);
    
    // Single subscription with event: '*' - handles INSERT, UPDATE, DELETE
    const channelName = 'typing-status-list-optimized';
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'typing_status' },
        (payload) => {
          // First realtime event received - disable fallback polling
          if (!realtimeWorkingRef.current) {
            realtimeWorkingRef.current = true;
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          }

          // Track realtime event
          performanceAnalytics.trackRealtimeEvent(channelName);
          // Use payload directly instead of refresh() to avoid SELECT queries
          handleRealtimePayload(payload as RealtimePostgresChangesPayload<TypingStatusRow>);
        }
      )
      .subscribe();
    
    // Track subscription
    performanceAnalytics.trackRealtimeSubscription(channelName, 'typing_status');
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      performanceAnalytics.untrackRealtimeSubscription(channelName);
      supabase.removeChannel(channel);
    };
  }, [fetchCurrentPresence, handleRealtimePayload]);

  return { typingByClient };
};
