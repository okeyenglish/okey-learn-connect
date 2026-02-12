import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { playNotificationSound } from '@/hooks/useNotificationSound';
import { showBrowserNotification } from '@/hooks/useBrowserNotifications';
import { showChatBubbleNotification } from '@/components/ai-hub/ChatBubbleNotification';
import { getActiveChatOS } from '@/lib/activeChatOSStore';
import type { StaffMessage } from '@/hooks/useInternalStaffMessages';

interface StaffMessageNotificationsOptions {
  /**
   * Callback to open a staff chat when notification is clicked
   * @param staffUserId - The sender's user ID
   * @param isGroupChat - Whether this is a group chat
   * @param groupChatId - The group chat ID if applicable
   */
  onOpenChat?: (staffUserId: string, isGroupChat?: boolean, groupChatId?: string) => void;
  enabled?: boolean;
}

/**
 * Hook for showing toast notifications when staff messages arrive.
 * Displays sender name and opens chat on click.
 */
export const useStaffMessageNotifications = (options: StaffMessageNotificationsOptions = {}) => {
  const { onOpenChat, enabled = true } = options;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const lastNotifiedRef = useRef<string | null>(null);
  const profileCacheRef = useRef<Map<string, { firstName?: string; lastName?: string }>>(new Map());

  // Fetch sender profile from cache or database
  const getSenderName = useCallback(async (senderId: string): Promise<string> => {
    // Check cache first
    if (profileCacheRef.current.has(senderId)) {
      const cached = profileCacheRef.current.get(senderId);
      const name = [cached?.firstName, cached?.lastName].filter(Boolean).join(' ');
      return name || 'Сотрудник';
    }

    // Fetch from database
    try {
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', senderId)
        .single();

      if (data) {
        profileCacheRef.current.set(senderId, {
          firstName: data.first_name || undefined,
          lastName: data.last_name || undefined,
        });
        const name = [data.first_name, data.last_name].filter(Boolean).join(' ');
        return name || 'Сотрудник';
      }
    } catch (error) {
      console.error('[StaffMessageNotifications] Failed to fetch sender profile:', error);
    }

    return 'Сотрудник';
  }, []);

  // Fetch group name from cache or database
  const getGroupName = useCallback(async (groupChatId: string): Promise<string> => {
    try {
      const { data } = await supabase
        .from('staff_group_chats')
        .select('name')
        .eq('id', groupChatId)
        .single();

      return data?.name || 'Группа';
    } catch {
      return 'Группа';
    }
  }, []);

  useEffect(() => {
    if (!enabled || !user?.id) return;

    const channel = supabase
      .channel(`staff-msg-notifications-toast-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'internal_staff_messages',
        },
        async (payload) => {
          const newMessage = payload.new as StaffMessage;

          // Only notify for messages TO this user (direct or group), not FROM this user
          const isDirectToMe = newMessage.recipient_user_id === user.id;
          const isGroupMessage = !!newMessage.group_chat_id;

          // For group messages, we need to check if user is a member
          // For now, assume any group message is relevant (will be filtered by permissions)
          if (!isDirectToMe && !isGroupMessage) return;
          if (newMessage.sender_id === user.id) return;

          // Invalidate preview caches so chat list updates in real-time
          queryClient.invalidateQueries({ queryKey: ['staff-conversation-previews'] });
          queryClient.invalidateQueries({ queryKey: ['staff-group-previews'] });
          queryClient.invalidateQueries({ queryKey: ['staff-unread-count'] });

          // Suppress notification if this chat is already open
          const activeChatOS = getActiveChatOS();
          if (activeChatOS.type === 'staff' && activeChatOS.id === newMessage.sender_id && !isGroupMessage) return;
          if (activeChatOS.type === 'group' && activeChatOS.id === newMessage.group_chat_id && isGroupMessage) return;

          // Prevent duplicate notifications
          if (lastNotifiedRef.current === newMessage.id) return;
          lastNotifiedRef.current = newMessage.id;

          // Get sender name
          const senderName = await getSenderName(newMessage.sender_id);
          const messagePreview = newMessage.message_text?.substring(0, 80) || 'Новое сообщение';

          // Determine notification title
          let title: string;
          let groupChatName: string | undefined;

          if (isGroupMessage && newMessage.group_chat_id) {
            groupChatName = await getGroupName(newMessage.group_chat_id);
            title = `💬 ${senderName} в "${groupChatName}"`;
          } else {
            title = `💬 ${senderName}`;
          }

          // Play notification sound
          playNotificationSound(0.5, 'chat');

          // Show toast notification with click handler
          const handleOpenChat = () => {
            if (onOpenChat) {
              if (isGroupMessage && newMessage.group_chat_id) {
                onOpenChat(newMessage.sender_id, true, newMessage.group_chat_id);
              } else {
                onOpenChat(newMessage.sender_id, false);
              }
            }
          };

          showChatBubbleNotification({
            id: newMessage.id,
            senderName: title.replace('💬 ', ''),
            senderInitial: senderName.charAt(0).toUpperCase(),
            message: messagePreview,
            onOpen: handleOpenChat,
          });

          // Show browser notification if tab is not visible
          if (document.hidden) {
            showBrowserNotification({
              title,
              body: messagePreview,
              tag: `staff-msg-${newMessage.id}`,
              onClick: () => {
                if (onOpenChat) {
                  if (isGroupMessage && newMessage.group_chat_id) {
                    onOpenChat(newMessage.sender_id, true, newMessage.group_chat_id);
                  } else {
                    onOpenChat(newMessage.sender_id, false);
                  }
                }
              },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, user?.id, getSenderName, getGroupName, onOpenChat]);
};

export default useStaffMessageNotifications;
