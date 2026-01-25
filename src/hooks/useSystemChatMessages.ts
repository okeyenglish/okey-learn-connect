import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTeacherChats } from '@/hooks/useTeacherChats';

// Hook to fetch last message and unread count for system chats (corporate/teachers)
export const useSystemChatMessages = () => {
  const [corporateChats, setCorporateChats] = useState<any[]>([]);
  const queryClient = useQueryClient();

  // Corporate branches mapping
  const corporateBranches = [
    { id: 'okskaya', name: 'Окская' },
    { id: 'kotelniki', name: 'Котельники' },
    { id: 'stakhanovskaya', name: 'Стахановская' },
    { id: 'novokosino', name: 'Новокосино' },
    { id: 'mytishchi', name: 'Мытищи' },
    { id: 'solntsevo', name: 'Солнцево' },
    { id: 'online', name: 'Онлайн' },
  ];

  // Load corporate chats only (teachers now come from useTeacherChats)
  const { data: corporateChatsData, isLoading: corporateLoading } = useQuery({
    queryKey: ['system-chats', 'corporate'],
    queryFn: async () => {
      // Get corporate chat clients only
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, branch')
        .or('name.ilike.%Корпоративный чат%,name.ilike.%Чат педагогов%')
        .order('updated_at', { ascending: false });

      if (clientsError) throw clientsError;

      // Get latest message for each client
      const chatData = await Promise.all(
        (clients || []).map(async (client) => {
          const { data: lastMsg } = await supabase
            .from('chat_messages')
            .select('message_text, created_at, is_read')
            .eq('client_id', client.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const { count: unreadCount } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', client.id)
            .eq('is_read', false)
            .eq('is_outgoing', false);

          return {
            id: client.id,
            name: client.name,
            branch: client.branch,
            lastMessage: lastMsg?.message_text || '',
            lastMessageTime: lastMsg?.created_at || '',
            unreadCount: unreadCount || 0,
            type: 'corporate'
          };
        })
      );

      return chatData;
    },
  });

  // Use the new teacher chats hook
  const { teachers: teacherChatsFromHook, totalUnread: teachersTotalUnread, isLoading: teachersLoading } = useTeacherChats(null);

  // Transform teacher chats to match expected format
  const teacherChats = useMemo(() => {
    return teacherChatsFromHook.map(teacher => ({
      id: teacher.id,
      name: teacher.fullName,
      branch: teacher.branch,
      lastMessage: teacher.lastMessageText || '',
      lastMessageTime: teacher.lastMessageTime || '',
      unreadCount: teacher.unreadMessages,
      type: 'teachers',
      clientId: teacher.clientId,
      phone: teacher.phone,
    }));
  }, [teacherChatsFromHook]);

  useEffect(() => {
    if (corporateChatsData) {
      setCorporateChats(corporateChatsData);
    }
  }, [corporateChatsData]);

  // Debounced real-time subscription for corporate chats
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null;
    let pendingRefetch = false;

    const debouncedRefetch = () => {
      pendingRefetch = true;
      
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      debounceTimer = setTimeout(() => {
        if (pendingRefetch) {
          queryClient.refetchQueries({ queryKey: ['system-chats', 'corporate'] });
          pendingRefetch = false;
        }
        debounceTimer = null;
      }, 2000);
    };

    const channel = supabase
      .channel('corporate-chats-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        debouncedRefetch
      )
      .subscribe();

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    corporateChats,
    teacherChats,
    teachersTotalUnread,
    isLoading: corporateLoading || teachersLoading,
  };
};
