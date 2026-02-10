import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from '@/hooks/useAuth';


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

// Heartbeat interval - update presence every 60 seconds (reduced for performance)
const HEARTBEAT_INTERVAL = 60_000;
// Stale threshold - consider presence stale after 90 seconds
const STALE_THRESHOLD_MS = 90_000;

// UUID validation helper - to prevent passing non-UUID strings (e.g., "teachers", "communities")
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

/**
 * Hook to track current user's presence in a specific chat
 * Updates presence on mount and via heartbeat
 */
// Idle timeout - mark as idle after 2 minutes of inactivity
const IDLE_TIMEOUT_MS = 2 * 60 * 1000;

export const useChatPresenceTracker = (clientId: string | null) => {
  const { user, profile } = useAuth();
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

  // Sync user info from AuthProvider (eliminates getUser() call)
  useEffect(() => {
    if (user) {
      currentUserIdRef.current = user.id;
      
      if (profile) {
        const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
        managerNameRef.current = name || null;
        avatarUrlRef.current = profile.avatar_url || null;
        profileLoadedRef.current = true;

        // If there was a pending presence update, do it now with correct name
        if (pendingClientIdRef.current) {
          const targetClientId = pendingClientIdRef.current;
          pendingClientIdRef.current = null;
          // Re-upsert with correct name
          supabase
            .from('chat_presence')
            .upsert({
              user_id: user.id,
              client_id: targetClientId,
              presence_type: 'viewing',
              manager_name: managerNameRef.current,
              manager_avatar_url: avatarUrlRef.current,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,client_id' });
        }
      }
    }
  }, [user, profile]);

  // Update presence in database - clears all other presence first to ensure only one active chat
  const updatePresence = useCallback(async (targetClientId: string, type: PresenceType = 'viewing') => {
    const userId = currentUserIdRef.current;
    // Skip non-UUID clientIds (e.g., "teachers", "communities") - they cause DB errors
    if (!userId || !targetClientId || !isValidUUID(targetClientId)) return;

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
    // Skip non-UUID clientIds (e.g., "teachers", "communities")
    if (!userId || !targetClientId || !isValidUUID(targetClientId)) return;

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
    // Skip non-UUID clientIds (e.g., "teachers", "communities") - causes DB UUID parse error
    if (!clientId || !isValidUUID(clientId)) {
      // Clear previous presence when switching away (only if it was a valid UUID)
      if (lastClientIdRef.current && isValidUUID(lastClientIdRef.current)) {
        clearPresence(lastClientIdRef.current);
      }
      lastClientIdRef.current = null;
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
  const { user } = useAuth();
  const [presenceByClient, setPresenceByClient] = useState<Record<string, PresenceInfo>>({});
  const currentUserIdRef = useRef<string | null>(null);

  // Sync user ID from AuthProvider (eliminates getUser() call)
  useEffect(() => {
    currentUserIdRef.current = user?.id ?? null;
  }, [user]);

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
        name: record.manager_name || 'Сотрудник',
        avatarUrl: record.manager_avatar_url,
        type: record.presence_type as PresenceType,
      });
    });

    setPresenceByClient(map);
  }, []);


  // Polling-only (postgres_changes removed — chat_presence dropped from supabase_realtime publication)
  // 30s polling is acceptable for presence indicators in chat list
  useEffect(() => {
    fetchPresence();

    const refreshInterval = setInterval(fetchPresence, 30_000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, [fetchPresence]);

  return { presenceByClient };
};
