import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Hook to fetch last message and unread count for system chats (corporate/teachers)
export const useSystemChatMessages = () => {
  const [corporateChats, setCorporateChats] = useState<any[]>([]);
  const [teacherChats, setTeacherChats] = useState<any[]>([]);
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

  // Load system chat data
  const { data: systemChatsData, isLoading } = useQuery({
    queryKey: ['system-chats'],
    queryFn: async () => {
      // Get all system chats (corporate + teachers)
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select(`
          id, name, branch,
          last_message:chat_messages!inner(
            message_text,
            created_at,
            is_read
          )
        `)
        .or('name.ilike.%Корпоративный чат%,name.ilike.%Чат педагогов%,name.ilike.%Преподаватель:%')
        .order('last_message_at', { ascending: false });

      if (clientsError) throw clientsError;

      // Get latest message for each client
      const chatData = await Promise.all(
        (clients || []).map(async (client: any) => {
          const { data: lastMsg, error } = await supabase
            .from('chat_messages')
            .select('message_text, created_at, is_read')
            .eq('client_id', client.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const { data: unreadCount } = await supabase
            .from('chat_messages')
            .select('id', { count: 'exact' })
            .eq('client_id', client.id)
            .eq('is_read', false);

          return {
            id: client.id,
            name: client.name,
            branch: client.branch,
            lastMessage: lastMsg?.message_text || '',
            lastMessageTime: lastMsg?.created_at || '',
            unreadCount: unreadCount?.length || 0,
            type: client.name.includes('Корпоративный') ? 'corporate' : 'teachers'
          };
        })
      );

      return chatData;
    },
  });

  useEffect(() => {
    if (systemChatsData) {
      const corporate = systemChatsData.filter(chat => chat.type === 'corporate');
      const teachers = systemChatsData.filter(chat => chat.type === 'teachers');
      setCorporateChats(corporate);
      setTeacherChats(teachers);
    }
  }, [systemChatsData]);

  // Real-time subscription for system chats
  useEffect(() => {
    const channel = supabase
      .channel('system-chats-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['system-chats'] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['system-chats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    corporateChats,
    teacherChats,
    isLoading,
  };
};