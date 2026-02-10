import { useEffect, useRef } from 'react';
import { onMessageEvent, offMessageEvent } from './useOrganizationRealtimeMessages';
import type { ChatMessagePayload } from './useOrganizationRealtimeMessages';
import { playNotificationSound } from '@/hooks/useNotificationSound';
import { getNotificationSettings } from '@/hooks/useNotificationSettings';
import { showBrowserNotification } from '@/hooks/useBrowserNotifications';

/**
 * Hook that plays a notification sound when a new incoming message is received.
 * Uses the callback registry from useOrganizationRealtimeMessages instead of
 * creating its own postgres_changes channel.
 * Only triggers for incoming messages (message_type = 'client')
 */
export const useChatNotificationSound = (
  activeClientId?: string,
  options: {
    enabled?: boolean;
    soundType?: 'chat' | 'default';
  } = {}
) => {
  const { enabled = true, soundType = 'chat' } = options;
  const lastNotifiedRef = useRef<string | null>(null);
  const isDocumentVisibleRef = useRef(true);
  const activeClientIdRef = useRef(activeClientId);

  // Keep refs in sync
  useEffect(() => {
    activeClientIdRef.current = activeClientId;
  }, [activeClientId]);

  // Track document visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      isDocumentVisibleRef.current = document.visibilityState === 'visible';
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleMessageEvent = (newMessage: ChatMessagePayload, eventType: string) => {
      // Only handle INSERT events
      if (eventType !== 'INSERT') return;

      // Only notify for incoming messages (from client)
      if (newMessage.message_type !== 'client') return;

      // Don't notify for the same message twice (use client_id + created_at as dedup key)
      const dedupeKey = `${newMessage.client_id}-${newMessage.created_at}`;
      if (lastNotifiedRef.current === dedupeKey) return;
      lastNotifiedRef.current = dedupeKey;

      // Check if sound notifications are enabled in settings
      const settings = getNotificationSettings();
      if (!settings.soundEnabled) {
        console.log('[ChatNotificationSound] Sound disabled in settings');
        return;
      }

      // Check if this messenger is muted
      const messengerType = newMessage.messenger_type || newMessage.messenger || '';
      if (settings.mutedMessengers?.includes(messengerType)) {
        console.log('[ChatNotificationSound] Messenger muted:', messengerType);
        return;
      }

      // Check if this specific chat is muted
      if (newMessage.client_id && settings.mutedChats?.includes(newMessage.client_id)) {
        console.log('[ChatNotificationSound] Chat muted:', newMessage.client_id?.slice(0, 8));
        return;
      }

      // Don't play sound if user is viewing this specific chat
      const isViewingThisChat = activeClientIdRef.current === newMessage.client_id && isDocumentVisibleRef.current;
      
      if (!isViewingThisChat) {
        console.log('[ChatNotificationSound] Playing notification sound for client:', newMessage.client_id?.slice(0, 8));
        playNotificationSound(settings.soundVolume || 0.5, soundType);

        // Show browser notification if tab is not visible
        if (!isDocumentVisibleRef.current) {
          const messengerEmoji: Record<string, string> = {
            whatsapp: '💬',
            telegram: '✈️',
            max: '📨',
          };
          const emoji = messengerEmoji[newMessage.messenger_type || ''] || '💬';
          const messageText = newMessage.message_text || newMessage.content || 'Новое сообщение';
          
          showBrowserNotification({
            title: `${emoji} Новое сообщение`,
            body: messageText.substring(0, 100),
            tag: `chat-${newMessage.client_id}`,
          });
        }
      }
    };

    onMessageEvent(handleMessageEvent);
    return () => {
      offMessageEvent(handleMessageEvent);
    };
  }, [enabled, soundType]);
};

export default useChatNotificationSound;
