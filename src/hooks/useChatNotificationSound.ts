import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { playNotificationSound } from '@/hooks/useNotificationSound';
import { getNotificationSettings } from '@/hooks/useNotificationSettings';
import { showBrowserNotification } from '@/hooks/useBrowserNotifications';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface ChatMessagePayload {
  id: string;
  client_id: string;
  message_type: string;
  message_text: string;
  messenger_type?: string;
  messenger?: string;
  sender_name?: string;
  created_at: string;
}

/**
 * Hook that plays a notification sound when a new incoming message is received
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

    const channel = supabase
      .channel('chat-notification-sound')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload: RealtimePostgresChangesPayload<ChatMessagePayload>) => {
          const newMessage = payload.new as ChatMessagePayload;
          
          // Only notify for incoming messages (from client)
          if (newMessage.message_type !== 'client') {
            return;
          }

          // Don't notify for the same message twice
          if (lastNotifiedRef.current === newMessage.id) {
            return;
          }
          lastNotifiedRef.current = newMessage.id;

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
          if (settings.mutedChats?.includes(newMessage.client_id)) {
            console.log('[ChatNotificationSound] Chat muted:', newMessage.client_id?.slice(0, 8));
            return;
          }

          // Don't play sound if user is viewing this specific chat
          // (they can see the message appearing)
          const isViewingThisChat = activeClientId === newMessage.client_id && isDocumentVisibleRef.current;
          
          if (!isViewingThisChat) {
            console.log('[ChatNotificationSound] Playing notification sound for message:', newMessage.id?.slice(0, 8));
            playNotificationSound(settings.soundVolume || 0.5, soundType);

            // Show browser notification if tab is not visible
            if (!isDocumentVisibleRef.current) {
              const messengerEmoji: Record<string, string> = {
                whatsapp: '💬',
                telegram: '✈️',
                max: '📨',
              };
              const emoji = messengerEmoji[newMessage.messenger_type || ''] || '💬';
              
              showBrowserNotification({
                title: `${emoji} Новое сообщение`,
                body: newMessage.message_text?.substring(0, 100) || 'Новое сообщение',
                tag: `chat-${newMessage.client_id}`,
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[ChatNotificationSound] Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, activeClientId, soundType]);
};

export default useChatNotificationSound;
