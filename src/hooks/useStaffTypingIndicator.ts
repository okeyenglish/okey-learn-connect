import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from '@/hooks/useAuth';

interface TypingUser {
  id: string;
  firstName: string;
  lastName: string;
  isTyping: boolean;
  text?: string;
}

interface UseStaffTypingIndicatorProps {
  chatId: string; // recipient_user_id for DM or group_chat_id for groups
  chatType: 'direct' | 'group';
}

export const useStaffTypingIndicator = ({ chatId, chatType }: UseStaffTypingIndicatorProps) => {
  const { user, profile } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastBroadcastRef = useRef<number>(0);

  // Throttle broadcasts to every 2 seconds
  const THROTTLE_MS = 2000;
  const TYPING_TIMEOUT_MS = 5000; // Hide indicator after 5s of no activity

  useEffect(() => {
    if (!chatId || !user?.id) return;

    const channelName = chatType === 'direct' 
      ? `staff-typing-dm-${[user.id, chatId].sort().join('-')}`
      : `staff-typing-group-${chatId}`;

    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: user.id },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: TypingUser[] = [];
        
        Object.entries(state).forEach(([key, presences]) => {
          if (key !== user.id) {
            const presence = (presences as any[])[0];
            if (presence?.isTyping) {
              users.push({
                id: key,
                firstName: presence.firstName || '',
                lastName: presence.lastName || '',
                isTyping: true,
                text: presence.text,
              });
            }
          }
        });
        
        setTypingUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key !== user.id) {
          const presence = (newPresences as any[])[0];
          if (presence?.isTyping) {
            setTypingUsers(prev => {
              const existing = prev.find(u => u.id === key);
              if (existing) {
                return prev.map(u => u.id === key ? {
                  ...u,
                  isTyping: true,
                  text: presence.text,
                } : u);
              }
              return [...prev, {
                id: key,
                firstName: presence.firstName || '',
                lastName: presence.lastName || '',
                isTyping: true,
                text: presence.text,
              }];
            });
          }
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key !== user.id) {
          setTypingUsers(prev => prev.filter(u => u.id !== key));
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track initial presence as not typing
          await channel.track({
            isTyping: false,
            firstName: profile?.first_name || '',
            lastName: profile?.last_name || '',
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [chatId, chatType, user?.id, profile?.first_name, profile?.last_name]);

  const setTyping = useCallback((isTyping: boolean, text?: string) => {
    if (!channelRef.current || !profile) return;

    const now = Date.now();
    
    // Throttle typing broadcasts
    if (isTyping && now - lastBroadcastRef.current < THROTTLE_MS) {
      return;
    }

    lastBroadcastRef.current = now;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Track typing state
    channelRef.current.track({
      isTyping,
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      text: text?.substring(0, 50), // Limit preview to 50 chars
    });

    // Auto-stop typing after timeout
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        channelRef.current?.track({
          isTyping: false,
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
        });
      }, TYPING_TIMEOUT_MS);
    }
  }, [profile]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (channelRef.current && profile) {
      channelRef.current.track({
        isTyping: false,
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
      });
    }
  }, [profile]);

  return {
    typingUsers,
    setTyping,
    stopTyping,
  };
};
