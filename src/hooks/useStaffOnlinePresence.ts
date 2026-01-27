import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from '@/hooks/useAuth';

interface OnlineUser {
  id: string;
  name: string;
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
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // Track current user's presence
  useEffect(() => {
    if (!user?.id || !profile) return;

    const userName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Сотрудник';

    const channel = supabase.channel(PRESENCE_ROOM);
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<OnlineUser>();
        const userIds = new Set<string>();
        
        const now = Date.now();
        Object.values(state).forEach((presences) => {
          presences.forEach((presence) => {
            // Only include users that have been active recently
            if (presence.id && now - presence.lastSeen < STALE_THRESHOLD) {
              userIds.add(presence.id);
            }
          });
        });
        
        setOnlineUserIds(userIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track our presence
          await channel.track({
            id: user.id,
            name: userName,
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
    return onlineUserIds.has(userId);
  }, [onlineUserIds]);

  return {
    onlineUserIds,
    isUserOnline,
  };
};

export default useStaffOnlinePresence;
