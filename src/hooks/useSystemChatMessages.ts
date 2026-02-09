import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTeacherChats } from '@/hooks/useTeacherChats';
import { useTeacherConversations } from '@/hooks/useTeacherConversations';

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
      if (!clients || clients.length === 0) return [];

      const clientIds = clients.map(c => c.id);

      // BATCH: Get last messages for ALL clients in one query
      // Self-hosted uses message_text, not content
      const { data: lastMessages } = await supabase
        .from('chat_messages')
        .select('client_id, message_text, created_at')
        .in('client_id', clientIds)
        .order('created_at', { ascending: false })
        .limit(500);

      // BATCH: Get unread counts for ALL clients in one query (self-hosted: is_outgoing=false)
      const { data: unreadMessages } = await supabase
        .from('chat_messages')
        .select('client_id')
        .in('client_id', clientIds)
        .eq('is_read', false)
        .eq('is_outgoing', false);

      // Build lookup maps (use message_text for self-hosted compatibility)
      const lastMessageMap = new Map<string, { content: string; created_at: string }>();
      (lastMessages || []).forEach(msg => {
        if (!lastMessageMap.has(msg.client_id!) && msg.client_id) {
          lastMessageMap.set(msg.client_id, { 
            content: msg.message_text || '', 
            created_at: msg.created_at 
          });
        }
      });

      const unreadCountMap = new Map<string, number>();
      (unreadMessages || []).forEach(msg => {
        if (msg.client_id) {
          unreadCountMap.set(msg.client_id, (unreadCountMap.get(msg.client_id) || 0) + 1);
        }
      });

      // Map to final format using batch data
      return clients.map(client => {
        const lastMsg = lastMessageMap.get(client.id);
        return {
          id: client.id,
          name: client.name,
          branch: client.branch,
          lastMessage: lastMsg?.content || '',
          lastMessageTime: lastMsg?.created_at || '',
          unreadCount: unreadCountMap.get(client.id) || 0,
          type: 'corporate'
        };
      });
    },
  });

  // Use the teacher chats hook for teacher list
  const { teachers: teacherChatsFromHook, totalUnread: teachersTotalUnread, isLoading: teachersLoading } = useTeacherChats(null);
  
  // Also get teacher conversations (direct teacher_id messages) for preview data
  const { conversations: teacherConversations, totalUnread: conversationsUnread, isLoading: conversationsLoading } = useTeacherConversations();

  // Merge data: useTeacherChats for teacher list, useTeacherConversations for direct teacher_id messages
  const teacherChats = useMemo(() => {
    // Build a map of teacher_id -> conversation data (from useTeacherConversations)
    const convMap = new Map<string, {
      lastMessage: string;
      lastMessageTime: string;
      unreadCount: number;
    }>();
    
    teacherConversations.forEach(conv => {
      convMap.set(conv.teacherId, {
        lastMessage: conv.lastMessageText || '',
        lastMessageTime: conv.lastMessageTime || '',
        unreadCount: conv.unreadCount,
      });
    });
    
    // Map teacher list and merge with conversation data
    return teacherChatsFromHook.map(teacher => {
      const conv = convMap.get(teacher.id);
      
      return {
        id: teacher.id,
        name: teacher.fullName,
        branch: teacher.branch,
        // Prefer conversation data if available (direct teacher_id messages)
        lastMessage: conv?.lastMessage || teacher.lastMessageText || '',
        lastMessageTime: conv?.lastMessageTime || teacher.lastMessageTime || '',
        unreadCount: conv?.unreadCount ?? teacher.unreadMessages ?? 0,
        type: 'teachers',
        clientId: teacher.clientId || (conv ? `teacher:${teacher.id}` : null),
        phone: teacher.phone,
      };
    });
  }, [teacherChatsFromHook, teacherConversations]);

  useEffect(() => {
    if (corporateChatsData) {
      setCorporateChats(corporateChatsData);
    }
  }, [corporateChatsData]);

  // Debounced real-time subscription for all system chats (corporate + teachers)
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null;

    const debouncedRefetch = (includeTeachers: boolean) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      debounceTimer = setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['system-chats', 'corporate'] });
        if (includeTeachers) {
          // Refetch teacher conversations for updated previews
          queryClient.invalidateQueries({ queryKey: ['teacher-conversations'] });
        }
        debounceTimer = null;
      }, 500);
    };

    const channel = supabase
      .channel('system-chats-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newRecord = payload.new as Record<string, unknown>;
          // Check if it's a teacher message
          const isTeacherMessage = newRecord && newRecord.teacher_id;
          debouncedRefetch(!!isTeacherMessage);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newRecord = payload.new as Record<string, unknown>;
          const isTeacherMessage = newRecord && newRecord.teacher_id;
          debouncedRefetch(!!isTeacherMessage);
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Sum unread from the already-merged teacherChats so badge matches the list
  const effectiveTeachersUnread = teacherChats.reduce((sum, t) => sum + (t.unreadCount || 0), 0);

  return {
    corporateChats,
    teacherChats,
    teachersTotalUnread: effectiveTeachersUnread,
    isLoading: corporateLoading || teachersLoading || conversationsLoading,
  };
};
