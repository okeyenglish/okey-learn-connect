import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from '@/hooks/useAuth';

export interface OnlineUser {
  id: string;
  name: string;
  avatarUrl?: string | null;
  lastSeen: number;
}

const PRESENCE_ROOM = 'staff-online-presence';
const HEARTBEAT_INTERVAL = 30_000; // 30 seconds
const STALE_THRESHOLD = 60_000; // 1 minute - consider offline after this

/**
 * Hook to track which staff members are currently online in the system.
 * Uses Supabase Realtime Presence for real-time updates.
 */
export const useStaffOnlinePresence = () => {
  const { user, profile } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Map<string, OnlineUser>>(new Map());
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
        const usersMap = new Map<string, OnlineUser>();
        
        const now = Date.now();
        Object.values(state).forEach((presences) => {
          presences.forEach((presence) => {
            // Only include users that have been active recently and exclude current user
            if (presence.id && now - presence.lastSeen < STALE_THRESHOLD && presence.id !== user.id) {
              usersMap.set(presence.id, {
                id: presence.id,
                name: presence.name,
                avatarUrl: presence.avatarUrl,
                lastSeen: presence.lastSeen,
              });
            }
          });
        });
        
        setOnlineUsers(usersMap);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track our presence
          await channel.track({
            id: user.id,
            name: userName,
            avatarUrl,
            lastSeen: Date.now(),
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
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  const onlineUsersList = Array.from(onlineUsers.values());
  const onlineUserIds = new Set(onlineUsers.keys());

  return {
    onlineUsers: onlineUsersList,
    onlineUserIds,
    isUserOnline,
    onlineCount: onlineUsersList.length,
  };
};

export default useStaffOnlinePresence;
