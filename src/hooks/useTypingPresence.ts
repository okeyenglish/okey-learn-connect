import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import type { TypingStatus } from '@/integrations/supabase/database.types';
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
  last_activity?: string | null;
};

// Soft typing sound (shorter/quieter than message notification)
const TYPING_SOUND_BASE64 = 
  'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYb/////////////////////////////////';

let typingSoundAudio: HTMLAudioElement | null = null;
let lastTypingSoundTime = 0;
const TYPING_SOUND_INTERVAL = 3000;

const playTypingSound = () => {
  try {
    const stored = localStorage.getItem('notification_settings');
    if (stored) {
      const settings = JSON.parse(stored);
      if (settings.soundEnabled === false) return;
    }
  } catch {
    // Ignore
  }

  const now = Date.now();
  if (now - lastTypingSoundTime < TYPING_SOUND_INTERVAL) return;

  try {
    if (!typingSoundAudio) {
      typingSoundAudio = new Audio(TYPING_SOUND_BASE64);
    }
    typingSoundAudio.volume = 0.2;
    lastTypingSoundTime = now;
    typingSoundAudio.currentTime = 0;
    typingSoundAudio.play().catch(() => {});
  } catch {
    // Audio not supported
  }
};

// Consider typing stale after 10s
const TYPING_TTL_MS = 10_000;
// Polling interval — 10s (compensates for removed postgres_changes)
const POLLING_INTERVAL_MS = 10_000;

/**
 * Tracks typing presence across all clients for chat list sidebar.
 * 
 * OPTIMIZED: Polling-only (no postgres_changes subscription).
 * typing_status was removed from supabase_realtime publication to reduce
 * WAL decoding CPU load on self-hosted server.
 * 10s polling is acceptable for sidebar-level indicators.
 */
export const useTypingPresence = () => {
  const [typingByClient, setTypingByClient] = useState<Record<string, TypingPresence>>({});
  const prevTypingCountRef = useRef<number>(0);

  const fetchCurrentPresence = useCallback(async () => {
    const start = performance.now();
    const cutoff = new Date(Date.now() - TYPING_TTL_MS).toISOString();
    const { data, error } = await supabase
      .from('typing_status')
      .select('client_id,user_id,is_typing,manager_name,draft_text,updated_at,last_activity')
      .eq('is_typing', true)
      .or(`updated_at.gt.${cutoff},last_activity.gt.${cutoff}`);
    
    if (error) {
      console.error('[useTypingPresence] Fetch error:', error);
      return;
    }
    
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

    // Check for new typing users to play sound
    let totalTypingCount = 0;

    Object.keys(map).forEach((clientId) => {
      const users = map[clientId].users || {};
      const drafts = map[clientId].drafts || {};
      const names = Array.from(new Set(Object.values(users)));
      const draftText = Object.values(drafts)[0] || null;
      const count = Object.keys(users).length;
      totalTypingCount += count;
      map[clientId] = {
        ...map[clientId],
        count,
        names,
        draftText,
      };
    });

    // Play sound if new typing users appeared
    if (totalTypingCount > prevTypingCountRef.current && prevTypingCountRef.current >= 0) {
      playTypingSound();
    }
    prevTypingCountRef.current = totalTypingCount;

    setTypingByClient(map);
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchCurrentPresence();

    // Poll every 10 seconds
    const interval = setInterval(fetchCurrentPresence, POLLING_INTERVAL_MS);
    
    return () => {
      clearInterval(interval);
    };
  }, [fetchCurrentPresence]);

  return { typingByClient };
};
