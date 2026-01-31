/**
 * Hook to fetch teacher conversations - messages with teacher_id set
 * This replaces the old teacher_client_links based approach
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useMemo, useEffect } from 'react';

export interface TeacherConversation {
  teacherId: string;
  teacherName: string;
  teacherFirstName: string;
  teacherLastName: string;
  teacherPhone: string | null;
  teacherEmail: string | null;
  teacherBranch: string | null;
  lastMessageTime: string | null;
  lastMessageText: string | null;
  lastMessengerType: string | null;
  unreadCount: number;
  avatarUrl: string | null;
}

/**
 * Fetches all teachers that have messages (teacher_id IS NOT NULL in chat_messages)
 * Returns conversation data for the CRM "Teachers" folder
 */
export const useTeacherConversations = (branch?: string | null) => {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['teacher-conversations', branch],
    queryFn: async (): Promise<TeacherConversation[]> => {
      // Step 1: Get all teachers with conversation stats
      // Using a subquery to get last message and unread count
      const { data: teachers, error: teachersError } = await supabase
        .from('teachers')
        .select('id, first_name, last_name, phone, email, branch, is_active')
        .eq('is_active', true)
        .order('last_name', { ascending: true });

      if (teachersError) {
        console.error('[useTeacherConversations] Error fetching teachers:', teachersError);
        throw teachersError;
      }

      if (!teachers || teachers.length === 0) {
        return [];
      }

      // Apply branch filter if provided
      const filteredTeachers = branch
        ? teachers.filter(t => t.branch === branch)
        : teachers;

      const teacherIds = filteredTeachers.map(t => t.id);

      // Step 2: Get message stats for each teacher
      // Get last message per teacher - use raw query for self-hosted compatibility
      // @ts-ignore - teacher_id column exists in self-hosted schema
      const { data: messageStats, error: statsError } = await (supabase
        .from('chat_messages') as any)
        .select('*')
        .in('teacher_id', teacherIds)
        .order('created_at', { ascending: false });

      if (statsError) {
        console.warn('[useTeacherConversations] Error fetching message stats:', statsError);
      }

      // Process message stats into per-teacher data
      const teacherStatsMap = new Map<string, {
        lastMessageTime: string | null;
        lastMessageText: string | null;
        lastMessengerType: string | null;
        unreadCount: number;
      }>();

      // Group messages by teacher and calculate stats
      const messagesByTeacher = new Map<string, any[]>();
      (messageStats || []).forEach((msg: any) => {
        const tid = msg.teacher_id;
        if (!tid) return;
        if (!messagesByTeacher.has(tid)) {
          messagesByTeacher.set(tid, []);
        }
        messagesByTeacher.get(tid)!.push(msg);
      });

      messagesByTeacher.forEach((messages, teacherId) => {
        const sortedMessages = messages.sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        const lastMessage = sortedMessages[0];
        // Handle both self-hosted (is_outgoing) and Cloud (direction) schemas
        const unreadCount = messages.filter(
          (m: any) => !m.is_read && (m.is_outgoing === false || m.direction === 'incoming')
        ).length;

        teacherStatsMap.set(teacherId, {
          lastMessageTime: lastMessage?.created_at || null,
          lastMessageText: lastMessage?.message_text || lastMessage?.content || null,
          lastMessengerType: lastMessage?.messenger_type || lastMessage?.messenger || null,
          unreadCount,
        });
      });

      // Step 3: Combine teachers with their stats
      const conversations: TeacherConversation[] = filteredTeachers
        .map(teacher => {
          const stats = teacherStatsMap.get(teacher.id);
          
          return {
            teacherId: teacher.id,
            teacherName: `${teacher.last_name || ''} ${teacher.first_name || ''}`.trim() || 'Преподаватель',
            teacherFirstName: teacher.first_name || '',
            teacherLastName: teacher.last_name || '',
            teacherPhone: teacher.phone,
            teacherEmail: teacher.email,
            teacherBranch: teacher.branch,
            lastMessageTime: stats?.lastMessageTime || null,
            lastMessageText: stats?.lastMessageText || null,
            lastMessengerType: stats?.lastMessengerType || null,
            unreadCount: stats?.unreadCount || 0,
            avatarUrl: null, // Teachers don't have avatar_url in current schema
          };
        })
        // Only show teachers with conversations
        .filter(c => c.lastMessageTime !== null);

      // Sort: unread first, then by last message time
      return conversations.sort((a, b) => {
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
        
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return timeB - timeA;
      });
    },
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  // Real-time subscription for new teacher messages
  useEffect(() => {
    const channel = supabase
      .channel('teacher-conversations-realtime')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages',
          filter: 'teacher_id=neq.null'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['teacher-conversations'] });
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'chat_messages',
          filter: 'teacher_id=neq.null'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['teacher-conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Calculate total unread
  const totalUnread = useMemo(() => {
    return (data || []).reduce((sum, c) => sum + c.unreadCount, 0);
  }, [data]);

  return {
    conversations: data || [],
    totalUnread,
    isLoading,
    error,
    refetch,
  };
};

export default useTeacherConversations;
