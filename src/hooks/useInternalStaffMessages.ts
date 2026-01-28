import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useRef } from 'react';
import { playNotificationSound } from '@/hooks/useNotificationSound';
import { showBrowserNotification } from '@/hooks/useBrowserNotifications';

export interface StaffMessage {
  id: string;
  organization_id: string;
  sender_id: string;
  recipient_user_id?: string;
  group_chat_id?: string;
  message_text: string;
  message_type: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    avatar_url?: string;
  };
}

// Hook for fetching direct messages between two staff members
export const useStaffDirectMessages = (recipientUserId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['staff-direct-messages', recipientUserId],
    queryFn: async () => {
      if (!user?.id || !recipientUserId) return [];
      
      const { data, error } = await supabase
        .from('internal_staff_messages')
        .select(`
          *,
          sender:profiles!internal_staff_messages_sender_id_fkey(
            id, first_name, last_name, email, avatar_url
          )
        `)
        .or(`and(sender_id.eq.${user.id},recipient_user_id.eq.${recipientUserId}),and(sender_id.eq.${recipientUserId},recipient_user_id.eq.${user.id})`)
        .is('group_chat_id', null)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching staff direct messages:', error);
        return [];
      }
      
      return data as StaffMessage[];
    },
    enabled: !!user?.id && !!recipientUserId
  });

  // Real-time subscription
  useEffect(() => {
    if (!user?.id || !recipientUserId) return;

    const channel = supabase
      .channel(`staff-dm-${user.id}-${recipientUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'internal_staff_messages',
        },
        (payload) => {
          const newMessage = payload.new as StaffMessage;
          // Check if this message is part of this conversation
          if (
            (newMessage.sender_id === user.id && newMessage.recipient_user_id === recipientUserId) ||
            (newMessage.sender_id === recipientUserId && newMessage.recipient_user_id === user.id)
          ) {
            queryClient.invalidateQueries({ queryKey: ['staff-direct-messages', recipientUserId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, recipientUserId, queryClient]);

  return query;
};

// Hook for fetching group chat messages
export const useStaffGroupMessages = (groupChatId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['staff-group-messages', groupChatId],
    queryFn: async () => {
      if (!groupChatId) return [];
      
      const { data, error } = await supabase
        .from('internal_staff_messages')
        .select(`
          *,
          sender:profiles!internal_staff_messages_sender_id_fkey(
            id, first_name, last_name, email, avatar_url
          )
        `)
        .eq('group_chat_id', groupChatId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching staff group messages:', error);
        return [];
      }
      
      return data as StaffMessage[];
    },
    enabled: !!groupChatId
  });

  // Real-time subscription
  useEffect(() => {
    if (!groupChatId) return;

    const channel = supabase
      .channel(`staff-group-${groupChatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'internal_staff_messages',
          filter: `group_chat_id=eq.${groupChatId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['staff-group-messages', groupChatId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupChatId, queryClient]);

  return query;
};

// Hook for sending staff messages
export const useSendStaffMessage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (messageData: {
      recipient_user_id?: string;
      group_chat_id?: string;
      message_text: string;
      message_type?: string;
      file_url?: string;
      file_name?: string;
      file_type?: string;
    }) => {
      if (!user?.id || !profile?.organization_id) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('internal_staff_messages')
        .insert({
          organization_id: profile.organization_id,
          sender_id: user.id,
          recipient_user_id: messageData.recipient_user_id || null,
          group_chat_id: messageData.group_chat_id || null,
          message_text: messageData.message_text,
          message_type: messageData.message_type || 'text',
          file_url: messageData.file_url || null,
          file_name: messageData.file_name || null,
          file_type: messageData.file_type || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      if (variables.recipient_user_id) {
        queryClient.invalidateQueries({ queryKey: ['staff-direct-messages', variables.recipient_user_id] });
      }
      if (variables.group_chat_id) {
        queryClient.invalidateQueries({ queryKey: ['staff-group-messages', variables.group_chat_id] });
      }
      queryClient.invalidateQueries({ queryKey: ['staff-conversations'] });
    },
    onError: (error: any) => {
      console.error('Error sending staff message:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отправить сообщение",
        variant: "destructive"
      });
    }
  });
};

// Hook for marking messages as read
export const useMarkStaffMessagesRead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { 
      recipient_user_id?: string;
      group_chat_id?: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      let query = supabase
        .from('internal_staff_messages')
        .update({ is_read: true })
        .eq('recipient_user_id', user.id)
        .eq('is_read', false);

      if (data.recipient_user_id) {
        query = query.eq('sender_id', data.recipient_user_id);
      }
      if (data.group_chat_id) {
        query = query.eq('group_chat_id', data.group_chat_id);
      }

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      if (variables.recipient_user_id) {
        queryClient.invalidateQueries({ queryKey: ['staff-direct-messages', variables.recipient_user_id] });
      }
      if (variables.group_chat_id) {
        queryClient.invalidateQueries({ queryKey: ['staff-group-messages', variables.group_chat_id] });
      }
      queryClient.invalidateQueries({ queryKey: ['staff-unread-count'] });
    }
  });
};

// Hook for getting unread message count with realtime sound notifications
export const useStaffUnreadCount = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const lastNotifiedRef = useRef<string | null>(null);

  // Realtime subscription for incoming messages
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`staff-messages-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'internal_staff_messages',
        },
        (payload) => {
          const newMessage = payload.new as StaffMessage;
          
          // Only notify for messages sent TO this user (not FROM this user)
          if (newMessage.recipient_user_id === user.id && newMessage.sender_id !== user.id) {
            // Prevent duplicate notifications
            if (lastNotifiedRef.current !== newMessage.id) {
              lastNotifiedRef.current = newMessage.id;
              
              // Play chat notification sound
              playNotificationSound(0.5, 'chat');
              
              // Show browser notification if tab is not focused
              if (document.hidden) {
                showBrowserNotification({
                  title: 'Новое сообщение от сотрудника',
                  body: newMessage.message_text?.substring(0, 100) || 'Новое сообщение',
                  tag: `staff-msg-${newMessage.id}`,
                });
              }
              
              // Invalidate unread count
              queryClient.invalidateQueries({ queryKey: ['staff-unread-count'] });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return useQuery({
    queryKey: ['staff-unread-count'],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from('internal_staff_messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error fetching unread count:', error);
        return 0;
      }
      
      return count || 0;
    },
    enabled: !!user?.id,
    refetchInterval: 30000 // Refresh every 30 seconds
  });
};

// Hook for getting all staff members for conversations
export const useStaffMembers = () => {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['staff-members'],
    queryFn: async () => {
      if (!profile?.organization_id) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url, branch')
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .neq('id', user?.id || '')
        .order('first_name');

      if (error) {
        console.error('Error fetching staff members:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!profile?.organization_id
  });
};

// Hook for getting last message previews for staff conversations
export interface StaffConversationPreview {
  recipientUserId: string;
  lastMessage: string | null;
  lastMessageTime: string | null;
  unreadCount: number;
}

export const useStaffConversationPreviews = (profileIds: string[]) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['staff-conversation-previews', profileIds],
    queryFn: async () => {
      if (!user?.id || profileIds.length === 0) return {} as Record<string, StaffConversationPreview>;

      const previews: Record<string, StaffConversationPreview> = {};

      // Initialize all profiles with empty previews
      profileIds.forEach(id => {
        previews[id] = {
          recipientUserId: id,
          lastMessage: null,
          lastMessageTime: null,
          unreadCount: 0,
        };
      });

      // Fetch last messages for each conversation in parallel
      const promises = profileIds.map(async (recipientId) => {
        // Get last message
        const { data: messages } = await supabase
          .from('internal_staff_messages')
          .select('message_text, created_at')
          .or(`and(sender_id.eq.${user.id},recipient_user_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_user_id.eq.${user.id})`)
          .is('group_chat_id', null)
          .order('created_at', { ascending: false })
          .limit(1);

        // Get unread count
        const { count } = await supabase
          .from('internal_staff_messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', recipientId)
          .eq('recipient_user_id', user.id)
          .eq('is_read', false);

        if (messages && messages.length > 0) {
          previews[recipientId] = {
            recipientUserId: recipientId,
            lastMessage: messages[0].message_text,
            lastMessageTime: messages[0].created_at,
            unreadCount: count || 0,
          };
        } else {
          previews[recipientId].unreadCount = count || 0;
        }
      });

      await Promise.all(promises);
      return previews;
    },
    enabled: !!user?.id && profileIds.length > 0,
    staleTime: 30000,
  });
};
