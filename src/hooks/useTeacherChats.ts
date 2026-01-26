import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useEffect, useMemo } from 'react';
import { normalizePhone } from '@/utils/phoneNormalization';

// Cache normalized phone -> clientId to avoid repeated lookups (huge perf win on large clients table)
const teacherClientIdByPhoneCache = new Map<string, string>();

/**
 * Hook to load teacher chat messages using SECURITY DEFINER RPC
 * This bypasses RLS org filter for teacher-linked clients
 */
export const useTeacherChatMessages = (clientId: string, enabled = true) => {
  const { data: messages, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['teacher-chat-messages', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      console.log('[useTeacherChatMessages] Fetching for client:', clientId);
      const startTime = performance.now();
      const { data, error } = await supabase.rpc('get_teacher_chat_messages', {
        p_client_id: clientId
      });
      const elapsed = performance.now() - startTime;
      
      if (error) {
        console.error('[useTeacherChatMessages] Error:', error);
        throw error;
      }
      
      console.log(`[useTeacherChatMessages] Fetched ${(data || []).length} messages in ${elapsed.toFixed(2)}ms`);
      return data || [];
    },
    enabled: enabled && !!clientId,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 5,
    retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 8000),
  });

  return { messages: messages || [], isLoading, isFetching, error, refetch };
};

export interface TeacherChatItem {
  id: string; // teacher.id from teachers table
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  branch: string;
  subjects: string[] | null;
  categories: string[] | null;
  isActive: boolean;
  // Chat-related fields
  clientId: string | null; // linked client for chat
  unreadMessages: number;
  lastMessageTime: string | null;
  lastMessageText: string | null;
  lastMessengerType: string | null; // which messenger had the last message
  lastSeen: string;
  isOnline: boolean;
}

interface TeacherUnreadCount {
  teacher_id: string;
  client_id: string | null;
  unread_count: number;
  last_message_time: string | null;
  last_message_text: string | null;
  last_messenger_type: string | null;
}

/**
 * Hook to load all teachers from teachers table with their chat data
 * Links teachers to clients via normalized phone numbers
 */
export const useTeacherChats = (branch?: string | null) => {
  const queryClient = useQueryClient();

  // Fetch all active teachers
  const { data: teachers, isLoading: teachersLoading, error: teachersError } = useQuery({
    queryKey: ['teacher-chats', 'teachers', branch],
    queryFn: async () => {
      let query = supabase
        .from('teachers')
        .select('id, first_name, last_name, phone, email, branch, subjects, categories, is_active')
        .eq('is_active', true)
        .order('last_name', { ascending: true });

      // Optionally filter by branch
      if (branch) {
        query = query.eq('branch', branch);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []);
    },
    staleTime: 30000, // 30 seconds
  });

  // Fetch unread counts using RPC function
  const { data: unreadCounts, isLoading: unreadLoading } = useQuery({
    queryKey: ['teacher-chats', 'unread-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_teacher_unread_counts');
      if (error) {
        console.error('Error fetching teacher unread counts:', error);
        return [];
      }
      return (data || []) as TeacherUnreadCount[];
    },
    staleTime: 10000, // 10 seconds
    enabled: !!teachers?.length,
  });

  // Combine teachers with chat data
  const teacherChats = useMemo<TeacherChatItem[]>(() => {
    if (!teachers) return [];

    const unreadMap = new Map<string, TeacherUnreadCount>();
    if (unreadCounts) {
      unreadCounts.forEach(uc => {
        if (uc.teacher_id) {
          unreadMap.set(uc.teacher_id, uc);
        }
      });
    }

    return teachers.map((teacher) => {
      const unreadData = unreadMap.get(teacher.id);
      const fullName = `${teacher.last_name || ''} ${teacher.first_name || ''}`.trim();
      
      return {
        id: teacher.id,
        firstName: teacher.first_name || '',
        lastName: teacher.last_name || '',
        fullName: fullName || 'Преподаватель',
        phone: teacher.phone,
        email: teacher.email,
        branch: teacher.branch || '',
        subjects: teacher.subjects,
        categories: teacher.categories,
        isActive: teacher.is_active,
        clientId: unreadData?.client_id || null,
        unreadMessages: unreadData?.unread_count || 0,
        lastMessageTime: unreadData?.last_message_time || null,
        lastMessageText: unreadData?.last_message_text || null,
        lastMessengerType: unreadData?.last_messenger_type || null,
        lastSeen: unreadData?.last_message_time 
          ? new Date(unreadData.last_message_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
          : 'нет сообщений',
        isOnline: false,
      };
    });
  }, [teachers, unreadCounts]);

  // Sort: unread first, then by last message time
  const sortedTeachers = useMemo(() => {
    return [...teacherChats].sort((a, b) => {
      // Unread first
      if (a.unreadMessages > 0 && b.unreadMessages === 0) return -1;
      if (a.unreadMessages === 0 && b.unreadMessages > 0) return 1;
      
      // Then by last message time
      const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      
      // Finally alphabetically
      return a.fullName.localeCompare(b.fullName, 'ru');
    });
  }, [teacherChats]);

  // Real-time subscription for new messages
  useEffect(() => {
    const channel = supabase
      .channel('teacher-chats-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        () => {
          // Refetch unread counts when new messages arrive
          queryClient.invalidateQueries({ queryKey: ['teacher-chats', 'unread-counts'] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages' },
        () => {
          // Refetch when messages are marked as read
          queryClient.invalidateQueries({ queryKey: ['teacher-chats', 'unread-counts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Total unread for the teachers folder
  const totalUnread = useMemo(() => {
    return teacherChats.reduce((sum, t) => sum + t.unreadMessages, 0);
  }, [teacherChats]);

  return {
    teachers: sortedTeachers,
    totalTeachers: teachers?.length || 0,
    totalUnread,
    isLoading: teachersLoading || unreadLoading,
    error: teachersError,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-chats'] });
    },
  };
};

/**
 * Find or create a client for a teacher to enable chat
 */
export const useEnsureTeacherClient = () => {
  const findOrCreateClient = async (teacher: TeacherChatItem): Promise<string | null> => {
    if (!teacher.phone) {
      console.log('Teacher has no phone:', teacher.fullName);
      return null;
    }

    const normalized = normalizePhone(teacher.phone);
    if (!normalized) return null;

    // Fast path: in-memory cache
    const cached = teacherClientIdByPhoneCache.get(normalized);
    if (cached) return cached;

    // Try to find existing client by phone WITHOUT scanning the entire clients table
    // Strategy: search candidates by the last 10 digits (stable for RU numbers)
    const digits = normalized.replace(/\D/g, '');
    const last10 = digits.slice(-10);

    // If we don't have enough digits, fallback to a small contains search
    const likePattern = last10.length >= 8 ? `%${last10}%` : `%${digits}%`;

    const { data: candidates, error: candidatesError } = await supabase
      .from('clients')
      .select('id, phone')
      .not('phone', 'is', null)
      .ilike('phone', likePattern)
      .limit(50);

    if (!candidatesError && candidates?.length) {
      for (const client of candidates) {
        if (client.phone && normalizePhone(client.phone) === normalized) {
          teacherClientIdByPhoneCache.set(normalized, client.id);
          return client.id;
        }
      }
    }

    // Create new client for teacher
    const clientName = `Преподаватель: ${teacher.fullName}`;
    const { data: newClient, error } = await supabase
      .from('clients')
      .insert({
        name: clientName,
        phone: teacher.phone,
      })
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('Error creating client for teacher:', error);
      return null;
    }

    const createdId = newClient?.id || null;
    if (createdId) teacherClientIdByPhoneCache.set(normalized, createdId);
    return createdId;
  };

  return { findOrCreateClient };
};
