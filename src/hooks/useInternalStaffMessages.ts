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
  is_edited?: boolean;
  is_deleted?: boolean;
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
          event: '*',
          schema: 'public',
          table: 'internal_staff_messages',
        },
        (payload) => {
          const msg = (payload.new || payload.old) as StaffMessage;
          // Check if this message is part of this conversation
          if (
            (msg.sender_id === user.id && msg.recipient_user_id === recipientUserId) ||
            (msg.sender_id === recipientUserId && msg.recipient_user_id === user.id)
          ) {
            queryClient.invalidateQueries({ queryKey: ['staff-direct-messages', recipientUserId] });
            
            // Play sound notification for incoming new messages only
            if (payload.eventType === 'INSERT' && msg.sender_id !== user.id) {
              playNotificationSound(0.5, 'chat');
              showBrowserNotification({
                title: 'Новое сообщение',
                body: msg.message_text?.slice(0, 100) || 'Новое сообщение от сотрудника',
                tag: `staff-dm-${msg.sender_id}`,
              });
            }
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
          event: '*',
          schema: 'public',
          table: 'internal_staff_messages',
          filter: `group_chat_id=eq.${groupChatId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['staff-group-messages', groupChatId] });
          
          // Play sound notification for incoming new messages only
          const msg = payload.new as StaffMessage;
          if (payload.eventType === 'INSERT' && user?.id && msg.sender_id !== user.id) {
            playNotificationSound(0.5, 'chat');
            showBrowserNotification({
              title: 'Новое сообщение в группе',
              body: msg.message_text?.slice(0, 100) || 'Новое сообщение в групповом чате',
              tag: `staff-group-${groupChatId}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupChatId, queryClient, user?.id]);

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
      queryClient.invalidateQueries({ queryKey: ['staff-conversation-previews'] });
      queryClient.invalidateQueries({ queryKey: ['staff-group-previews'] });
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

// Hook for editing a staff message
export const useEditStaffMessage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ messageId, newText }: { messageId: string; newText: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('internal_staff_messages')
        .update({ message_text: newText, is_edited: true })
        .eq('id', messageId)
        .eq('sender_id', user.id); // Only own messages

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-direct-messages'] });
      queryClient.invalidateQueries({ queryKey: ['staff-group-messages'] });
      queryClient.invalidateQueries({ queryKey: ['staff-conversations'] });
    },
  });
};

// Hook for deleting a staff message
export const useDeleteStaffMessage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (messageId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('internal_staff_messages')
        .update({ message_text: 'Сообщение удалено', message_type: 'deleted', is_deleted: true, file_url: null, file_name: null, file_type: null })
        .eq('id', messageId)
        .eq('sender_id', user.id); // Only own messages

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-direct-messages'] });
      queryClient.invalidateQueries({ queryKey: ['staff-group-messages'] });
      queryClient.invalidateQueries({ queryKey: ['staff-conversations'] });
    },
  });
};

// Hook for marking messages as read (legacy - kept for compatibility)
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

// Hook for marking chat as read using per-user cursors (new approach)
export const useMarkStaffChatRead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (chatId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('staff_chat_read_cursors')
        .upsert({
          user_id: user.id,
          chat_id: chatId,
          last_read_at: new Date().toISOString()
        }, { onConflict: 'user_id,chat_id' });
      if (error) {
        console.error('Error upserting read cursor:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-conversation-previews'] });
      queryClient.invalidateQueries({ queryKey: ['staff-group-previews'] });
      queryClient.invalidateQueries({ queryKey: ['staff-unread-count'] });
    }
  });
};

// Helper: fetch all read cursors for current user
const fetchReadCursors = async (userId: string): Promise<Record<string, string>> => {
  const { data, error } = await supabase
    .from('staff_chat_read_cursors')
    .select('chat_id, last_read_at')
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error fetching read cursors:', error);
    return {};
  }
  
  const cursors: Record<string, string> = {};
  (data || []).forEach((row: any) => {
    cursors[row.chat_id] = row.last_read_at;
  });
  return cursors;
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

      // Fetch user's read cursors
      const cursors = await fetchReadCursors(user.id);

      let unreadCount = 0;

      // DM unread: messages sent to me, after my cursor for that sender
      const { data: allDmUnread } = await supabase
        .from('internal_staff_messages')
        .select('sender_id, created_at')
        .eq('recipient_user_id', user.id)
        .neq('sender_id', user.id);

      (allDmUnread || []).forEach((msg: any) => {
        const cursor = cursors[msg.sender_id];
        if (!cursor || new Date(msg.created_at) > new Date(cursor)) {
          unreadCount++;
        }
      });

      // Group unread: messages in groups, after my cursor for that group
      const { data: groupMessages } = await supabase
        .from('internal_staff_messages')
        .select('group_chat_id, created_at')
        .not('group_chat_id', 'is', null)
        .neq('sender_id', user.id);

      (groupMessages || []).forEach((msg: any) => {
        const cursor = cursors[msg.group_chat_id];
        if (!cursor || new Date(msg.created_at) > new Date(cursor)) {
          unreadCount++;
        }
      });

      return unreadCount;
    },
    enabled: !!user?.id,
    refetchInterval: 30000
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

// Hook for getting group chat previews (last message + unread count)
export interface StaffGroupChatPreview {
  groupId: string;
  lastMessage: string | null;
  lastMessageTime: string | null;
  lastMessageSender: string | null;
  unreadCount: number;
}

export const useStaffGroupChatPreviews = (groupIds: string[]) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['staff-group-previews', groupIds],
    queryFn: async () => {
      if (!user?.id || groupIds.length === 0) return {} as Record<string, StaffGroupChatPreview>;

      const cursors = await fetchReadCursors(user.id);

      const previews: Record<string, StaffGroupChatPreview> = {};
      groupIds.forEach(id => {
        previews[id] = { groupId: id, lastMessage: null, lastMessageTime: null, lastMessageSender: null, unreadCount: 0 };
      });

      const promises = groupIds.map(async (groupId) => {
        // Get last message with sender info
        const { data: messages } = await supabase
          .from('internal_staff_messages')
          .select('message_text, created_at, sender:profiles!internal_staff_messages_sender_id_fkey(first_name)')
          .eq('group_chat_id', groupId)
          .order('created_at', { ascending: false })
          .limit(1);

        // Get unread count using cursor
        const cursor = cursors[groupId];
        let unreadCount = 0;

        let unreadQuery = supabase
          .from('internal_staff_messages')
          .select('*', { count: 'exact', head: true })
          .eq('group_chat_id', groupId)
          .neq('sender_id', user.id);

        if (cursor) {
          unreadQuery = unreadQuery.gt('created_at', cursor);
        }

        const { count } = await unreadQuery;
        unreadCount = count || 0;

        if (messages && messages.length > 0) {
          const msg = messages[0] as any;
          previews[groupId] = {
            groupId,
            lastMessage: msg.message_text,
            lastMessageTime: msg.created_at,
            lastMessageSender: msg.sender?.first_name || null,
            unreadCount,
          };
        } else {
          previews[groupId].unreadCount = unreadCount;
        }
      });

      await Promise.all(promises);
      return previews;
    },
    enabled: !!user?.id && groupIds.length > 0,
    staleTime: 30000,
  });
};

export const useStaffConversationPreviews = (profileIds: string[]) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['staff-conversation-previews', profileIds],
    queryFn: async () => {
      if (!user?.id || profileIds.length === 0) return {} as Record<string, StaffConversationPreview>;

      const cursors = await fetchReadCursors(user.id);

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

        // Get unread count using cursor (chatId = recipientId for DMs)
        const cursor = cursors[recipientId];

        let unreadQuery = supabase
          .from('internal_staff_messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', recipientId)
          .eq('recipient_user_id', user.id);

        if (cursor) {
          unreadQuery = unreadQuery.gt('created_at', cursor);
        }

        const { count } = await unreadQuery;

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

/**
 * Hook to get read cursors for a specific chat (DM or group).
 * For DMs: returns the recipient's cursor so we know which messages they've read.
 * For groups: returns all members' cursors with their names.
 */
export interface ChatReadCursor {
  userId: string;
  firstName?: string;
  lastReadAt: string;
}

export const useChatReadCursors = (chatId: string, chatType: 'direct' | 'group') => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['chat-read-cursors', chatId, chatType],
    queryFn: async (): Promise<ChatReadCursor[]> => {
      if (!chatId || !user?.id) return [];

      const { data, error } = await supabase
        .from('staff_chat_read_cursors')
        .select('user_id, last_read_at')
        .eq('chat_id', chatId)
        .neq('user_id', user.id);

      if (error) {
        console.error('Error fetching chat read cursors:', error);
        return [];
      }

      if (!data || data.length === 0) return [];

      // Get profile names for group chats
      if (chatType === 'group') {
        const userIds = data.map((d: any) => d.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name')
          .in('id', userIds);

        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.first_name]));
        
        return data.map((d: any) => ({
          userId: d.user_id,
          firstName: profileMap.get(d.user_id) || undefined,
          lastReadAt: d.last_read_at,
        }));
      }

      return data.map((d: any) => ({
        userId: d.user_id,
        lastReadAt: d.last_read_at,
      }));
    },
    enabled: !!chatId && !!user?.id,
    staleTime: 10000,
    refetchInterval: 15000,
  });
};
