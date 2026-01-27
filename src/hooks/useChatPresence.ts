import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type PresenceType = 'viewing' | 'on_call' | 'idle';

export interface ChatPresenceRecord {
  user_id: string;
  client_id: string;
  presence_type: PresenceType;
  manager_name: string | null;
  manager_avatar_url: string | null;
  updated_at: string;
}

export interface PresenceInfo {
  viewers: Array<{
    userId: string;
    name: string;
    avatarUrl: string | null;
    type: PresenceType;
  }>;
}

// Heartbeat interval - update presence every 30 seconds
const HEARTBEAT_INTERVAL = 30_000;
// Stale threshold - consider presence stale after 60 seconds
const STALE_THRESHOLD_MS = 60_000;

/**
 * Hook to track current user's presence in a specific chat
 * Updates presence on mount and via heartbeat
 */
// Idle timeout - mark as idle after 2 minutes of inactivity
const IDLE_TIMEOUT_MS = 2 * 60 * 1000;

export const useChatPresenceTracker = (clientId: string | null) => {
  const currentUserIdRef = useRef<string | null>(null);
  const managerNameRef = useRef<string | null>(null);
  const avatarUrlRef = useRef<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastClientIdRef = useRef<string | null>(null);
  const profileLoadedRef = useRef<boolean>(false);
  const pendingClientIdRef = useRef<string | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentStatusRef = useRef<PresenceType>('viewing');
  const lastActivityRef = useRef<number>(Date.now());

  // Reset idle timer on user activity
  const resetIdleTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    // If was idle, switch back to viewing
    if (currentStatusRef.current === 'idle' && lastClientIdRef.current) {
      currentStatusRef.current = 'viewing';
      // Will update on next heartbeat or immediately if needed
    }
  }, []);

  // Track user activity
  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    
    events.forEach(event => {
      window.addEventListener(event, resetIdleTimer, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetIdleTimer);
      });
    };
  }, [resetIdleTimer]);

  // Load current user info once and update presence immediately after
  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      currentUserIdRef.current = userData.user?.id ?? null;

      if (currentUserIdRef.current) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url')
          .eq('id', currentUserIdRef.current)
          .maybeSingle();
        
        const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');
        managerNameRef.current = name || null;
        avatarUrlRef.current = profile?.avatar_url || null;
        profileLoadedRef.current = true;

        // If there was a pending presence update, do it now with correct name
        if (pendingClientIdRef.current) {
          const targetClientId = pendingClientIdRef.current;
          pendingClientIdRef.current = null;
          // Re-upsert with correct name
          await supabase
            .from('chat_presence')
            .upsert({
              user_id: currentUserIdRef.current,
              client_id: targetClientId,
              presence_type: 'viewing',
              manager_name: managerNameRef.current,
              manager_avatar_url: avatarUrlRef.current,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,client_id' });
        }
      }
    })();
  }, []);

  // Update presence in database - clears all other presence first to ensure only one active chat
  const updatePresence = useCallback(async (targetClientId: string, type: PresenceType = 'viewing') => {
    const userId = currentUserIdRef.current;
    if (!userId || !targetClientId) return;

    try {
      // First, delete ALL presence records for this user (ensures only one active chat)
      await supabase
        .from('chat_presence')
        .delete()
        .eq('user_id', userId)
        .neq('client_id', targetClientId);

      // Then upsert the current chat presence
      await supabase
        .from('chat_presence')
        .upsert({
          user_id: userId,
          client_id: targetClientId,
          presence_type: type,
          manager_name: managerNameRef.current,
          manager_avatar_url: avatarUrlRef.current,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,client_id' });
    } catch (err) {
      // Silently fail - presence is not critical
      console.warn('[useChatPresenceTracker] Failed to update presence:', err);
    }
  }, []);

  // Clear presence when leaving a chat
  const clearPresence = useCallback(async (targetClientId: string) => {
    const userId = currentUserIdRef.current;
    if (!userId || !targetClientId) return;

    try {
      await supabase
        .from('chat_presence')
        .delete()
        .eq('user_id', userId)
        .eq('client_id', targetClientId);
    } catch (err) {
      console.warn('[useChatPresenceTracker] Failed to clear presence:', err);
    }
  }, []);

  // Track presence for current chat
  useEffect(() => {
    if (!clientId) {
      // Clear previous presence when switching away
      if (lastClientIdRef.current) {
        clearPresence(lastClientIdRef.current);
        lastClientIdRef.current = null;
      }
      return;
    }

    // Clear old presence if switching chats
    if (lastClientIdRef.current && lastClientIdRef.current !== clientId) {
      clearPresence(lastClientIdRef.current);
    }
    // If profile is not loaded yet, mark as pending for re-update
    if (!profileLoadedRef.current) {
      pendingClientIdRef.current = clientId;
    }

    lastClientIdRef.current = clientId;
    currentStatusRef.current = 'viewing';
    lastActivityRef.current = Date.now();

    // Initial presence update
    updatePresence(clientId, 'viewing');

    // Heartbeat to keep presence alive and check for idle
    heartbeatRef.current = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      const shouldBeIdle = timeSinceActivity >= IDLE_TIMEOUT_MS;
      
      // Only update if status changed or heartbeat needed
      if (shouldBeIdle && currentStatusRef.current !== 'idle') {
        currentStatusRef.current = 'idle';
        updatePresence(clientId, 'idle');
      } else if (!shouldBeIdle && currentStatusRef.current === 'idle') {
        currentStatusRef.current = 'viewing';
        updatePresence(clientId, 'viewing');
      } else {
        // Regular heartbeat with current status
        updatePresence(clientId, currentStatusRef.current);
      }
    }, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      // Clear presence on unmount
      if (clientId) {
        clearPresence(clientId);
      }
    };
  }, [clientId, updatePresence, clearPresence]);

  // Handle page unload - clear all presence
  useEffect(() => {
    const handleUnload = () => {
      const userId = currentUserIdRef.current;
      if (userId) {
        // Use sendBeacon for reliable cleanup on page close
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/chat_presence?user_id=eq.${userId}`;
        navigator.sendBeacon?.(url, '');
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  return { updatePresence, clearPresence };
};

/**
 * Hook to get all viewers for all chats (for chat list)
 * Returns a map of clientId -> PresenceInfo
 */
export const useChatPresenceList = () => {
  const [presenceByClient, setPresenceByClient] = useState<Record<string, PresenceInfo>>({});
  const currentUserIdRef = useRef<string | null>(null);

  // Get current user ID
  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      currentUserIdRef.current = userData.user?.id ?? null;
    })();
  }, []);

  // Fetch all active presence records
  const fetchPresence = useCallback(async () => {
    const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();
    const { data, error } = await supabase
      .from('chat_presence')
      .select('user_id, client_id, presence_type, manager_name, manager_avatar_url, updated_at')
      .gt('updated_at', cutoff);

    if (error) {
      console.error('[useChatPresenceList] Fetch error:', error);
      return;
    }

    const map: Record<string, PresenceInfo> = {};
    
    (data || []).forEach((record: ChatPresenceRecord) => {
      // Skip current user's own presence
      if (record.user_id === currentUserIdRef.current) return;
      
      const key = record.client_id;
      if (!map[key]) {
        map[key] = { viewers: [] };
      }
      
      map[key].viewers.push({
        userId: record.user_id,
        name: record.manager_name || 'Менеджер',
        avatarUrl: record.manager_avatar_url,
        type: record.presence_type as PresenceType,
      });
    });

    setPresenceByClient(map);
  }, []);

  // Handle realtime updates
  const handleRealtimePayload = useCallback((
    payload: RealtimePostgresChangesPayload<ChatPresenceRecord>
  ) => {
    const eventType = payload.eventType;
    const record = (eventType === 'DELETE' ? payload.old : payload.new) as ChatPresenceRecord | undefined;

    if (!record) return;
    
    // Skip current user
    if (record.user_id === currentUserIdRef.current) return;

    const clientId = record.client_id;
    const isStale = record.updated_at && (Date.now() - new Date(record.updated_at).getTime() > STALE_THRESHOLD_MS);

    setPresenceByClient(prev => {
      const updated = { ...prev };
      const current = updated[clientId] || { viewers: [] };
      let viewers = [...current.viewers];

      if (eventType === 'DELETE' || isStale) {
        viewers = viewers.filter(v => v.userId !== record.user_id);
      } else {
        const existingIdx = viewers.findIndex(v => v.userId === record.user_id);
        const viewer = {
          userId: record.user_id,
          name: record.manager_name || 'Менеджер',
          avatarUrl: record.manager_avatar_url,
          type: record.presence_type as PresenceType,
        };

        if (existingIdx >= 0) {
          viewers[existingIdx] = viewer;
        } else {
          viewers.push(viewer);
        }
      }

      if (viewers.length === 0) {
        delete updated[clientId];
      } else {
        updated[clientId] = { viewers };
      }

      return updated;
    });
  }, []);

  // Initial fetch and realtime subscription
  useEffect(() => {
    fetchPresence();

    const channelName = 'chat-presence-list';
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_presence' },
        (payload) => handleRealtimePayload(payload as RealtimePostgresChangesPayload<ChatPresenceRecord>)
      )
      .subscribe();

    // Refresh periodically to clear stale entries
    const refreshInterval = setInterval(fetchPresence, 30_000);

    return () => {
      clearInterval(refreshInterval);
      supabase.removeChannel(channel);
    };
  }, [fetchPresence, handleRealtimePayload]);

  return { presenceByClient };
};
