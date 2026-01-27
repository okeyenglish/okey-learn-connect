import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from '@/hooks/useAuth';

export interface OnlineUser {
  id: string;
  name: string;
  avatarUrl?: string | null;
  lastSeen: number;
  isOnline: boolean;
}

const PRESENCE_ROOM = 'staff-online-presence';
const HEARTBEAT_INTERVAL = 30_000; // 30 seconds
const STALE_THRESHOLD = 60_000; // 1 minute - consider offline after this
const LAST_SEEN_STORAGE_KEY = 'staff-last-seen';

// Helper to format last seen time
export const formatLastSeen = (timestamp: number): string => {
  const now = new Date();
  const lastSeen = new Date(timestamp);
  const diffMs = now.getTime() - timestamp;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  const timeStr = lastSeen.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  if (diffMinutes < 1) {
    return 'Только что';
  }
  if (diffMinutes < 60) {
    return `Был(а) ${diffMinutes} мин. назад`;
  }
  if (diffHours < 24 && now.getDate() === lastSeen.getDate()) {
    return `Был(а) сегодня в ${timeStr}`;
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (lastSeen.getDate() === yesterday.getDate() && 
      lastSeen.getMonth() === yesterday.getMonth() &&
      lastSeen.getFullYear() === yesterday.getFullYear()) {
    return `Был(а) вчера в ${timeStr}`;
  }
  
  if (diffDays < 7) {
    const days = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
    return `Был(а) в ${days[lastSeen.getDay()]} в ${timeStr}`;
  }
  
  const dateStr = lastSeen.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  return `Был(а) ${dateStr}`;
};

// Load persisted last seen data
const loadLastSeenData = (): Record<string, OnlineUser> => {
  try {
    const data = localStorage.getItem(LAST_SEEN_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

// Save last seen data
const saveLastSeenData = (data: Record<string, OnlineUser>) => {
  try {
    localStorage.setItem(LAST_SEEN_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
};

/**
 * Hook to track which staff members are currently online in the system.
 * Uses Supabase Realtime Presence for real-time updates.
 * Also tracks last seen time for offline users.
 */
export const useStaffOnlinePresence = () => {
  const { user, profile } = useAuth();
  const [allUsers, setAllUsers] = useState<Map<string, OnlineUser>>(() => {
    const persisted = loadLastSeenData();
    return new Map(Object.entries(persisted));
  });
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // Track current user's presence
  useEffect(() => {
    if (!user?.id || !profile) return;

    const userName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Сотрудник';
    const avatarUrl = profile.avatar_url || null;

    const channel = supabase.channel(PRESENCE_ROOM);
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<OnlineUser>();
        const now = Date.now();
        
        // Get currently online users
        const onlineUserIds = new Set<string>();
        Object.values(state).forEach((presences) => {
          presences.forEach((presence) => {
            if (presence.id && now - presence.lastSeen < STALE_THRESHOLD && presence.id !== user.id) {
              onlineUserIds.add(presence.id);
            }
          });
        });
        
        setAllUsers(prev => {
          const newMap = new Map(prev);
          
          // Update online users
          Object.values(state).forEach((presences) => {
            presences.forEach((presence) => {
              if (presence.id && presence.id !== user.id) {
                const isOnline = now - presence.lastSeen < STALE_THRESHOLD;
                newMap.set(presence.id, {
                  id: presence.id,
                  name: presence.name,
                  avatarUrl: presence.avatarUrl,
                  lastSeen: presence.lastSeen,
                  isOnline,
                });
              }
            });
          });
          
          // Mark users that are no longer in presence as offline
          // but keep their last seen time
          newMap.forEach((userData, odId) => {
            if (!onlineUserIds.has(odId) && userData.isOnline) {
              newMap.set(odId, { ...userData, isOnline: false });
            }
          });
          
          // Persist to localStorage
          const toSave: Record<string, OnlineUser> = {};
          newMap.forEach((val, key) => {
            toSave[key] = val;
          });
          saveLastSeenData(toSave);
          
          return newMap;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: user.id,
            name: userName,
            avatarUrl,
            lastSeen: Date.now(),
            isOnline: true,
          });
        }
      });

    // Heartbeat to keep presence alive
    heartbeatRef.current = setInterval(async () => {
      if (channelRef.current) {
        await channelRef.current.track({
          id: user.id,
          name: userName,
          avatarUrl,
          lastSeen: Date.now(),
          isOnline: true,
        });
      }
    }, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, profile]);

  const isUserOnline = useCallback((userId: string): boolean => {
    const userData = allUsers.get(userId);
    return userData?.isOnline ?? false;
  }, [allUsers]);

  const getLastSeen = useCallback((userId: string): number | null => {
    const userData = allUsers.get(userId);
    return userData?.lastSeen ?? null;
  }, [allUsers]);

  const getLastSeenFormatted = useCallback((userId: string): string | null => {
    const lastSeen = getLastSeen(userId);
    if (!lastSeen) return null;
    if (isUserOnline(userId)) return null; // Don't show for online users
    return formatLastSeen(lastSeen);
  }, [getLastSeen, isUserOnline]);

  const onlineUsersList = Array.from(allUsers.values()).filter(u => u.isOnline);
  const onlineUserIds = new Set(onlineUsersList.map(u => u.id));

  return {
    onlineUsers: onlineUsersList,
    onlineUserIds,
    isUserOnline,
    getLastSeen,
    getLastSeenFormatted,
    onlineCount: onlineUsersList.length,
  };
};

export default useStaffOnlinePresence;
