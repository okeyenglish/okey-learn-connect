import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useEffect, useMemo } from 'react';
import { normalizePhone } from '@/utils/phoneNormalization';
import { startMetric, endMetric } from '@/lib/performanceMetrics';

// Cache normalized phone -> clientId to avoid repeated lookups (huge perf win on large clients table)
const teacherClientIdByPhoneCache = new Map<string, string>();

/**
 * Hook to load teacher chat messages using SECURITY DEFINER RPC
 * This bypasses RLS org filter for teacher-linked clients
 */
export const useTeacherChatMessages = (clientId: string, enabled = true) => {
  const { data: messages, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['teacher-chat-messages', clientId],
    queryFn: async ({ signal }) => {
      if (!clientId) return [];
      
      const metricId = startMetric('teacher-chat-messages', { clientId });

      // Abort hanging requests (Network shows long Pending for teacher chats)
      const TIMEOUT_MS = 12_000;
      const controller = new AbortController();
      const onAbort = () => controller.abort();
      signal?.addEventListener('abort', onAbort);
      const timeoutId = window.setTimeout(() => {
        controller.abort();
        endMetric(metricId, 'timeout');
      }, TIMEOUT_MS);

      try {
        // Use optimized RPC with built-in limit parameter
        // The RPC now accepts p_limit parameter directly for server-side limiting
        const MESSAGE_LIMIT = 200;
        
        try {
          // Call RPC with limit parameter (if optimized version is deployed)
          const { data, error } = await supabase.rpc('get_teacher_chat_messages', { 
            p_client_id: clientId,
            p_limit: MESSAGE_LIMIT 
          });

          if (error) {
            // If error is about unknown parameter, fallback to old signature
            if (error.message?.includes('p_limit') || error.code === 'PGRST202') {
              console.warn('[useTeacherChatMessages] Using legacy RPC without p_limit');
              const { data: legacyData, error: legacyError } = await supabase.rpc(
                'get_teacher_chat_messages', 
                { p_client_id: clientId }
              );
              if (legacyError) throw legacyError;
              endMetric(metricId, 'completed', { msgCount: (legacyData || []).length, method: 'rpc-legacy' });
              return (legacyData || []).slice(-MESSAGE_LIMIT); // Client-side limit for legacy
            }
            throw error;
          }

          endMetric(metricId, 'completed', { msgCount: (data || []).length, method: 'rpc-optimized' });
          return data || [];
        } catch (rpcErr) {
          // Fallback: try direct table select (fast) when RPC is hanging or unstable.
          console.warn('[useTeacherChatMessages] RPC failed/hung, trying direct chat_messages select...');

          const { data: directData, error: directError } = await (supabase as any)
            .from('chat_messages')
            .select(
              'id, client_id, message_text, message_type, system_type, is_read, created_at, file_url, file_name, file_type, external_message_id, messenger_type, call_duration, message_status, metadata'
            )
            .eq('client_id', clientId)
            .order('created_at', { ascending: false })
            .limit(200)
            .abortSignal(controller.signal);

          if (!directError) {
            endMetric(metricId, 'completed', { msgCount: (directData || []).length, method: 'direct' });
            return directData || [];
          }

          console.error('[useTeacherChatMessages] Direct select failed:', directError);
          endMetric(metricId, 'failed', { error: String(rpcErr) });
          throw rpcErr;
        }
      } finally {
        window.clearTimeout(timeoutId);
        signal?.removeEventListener('abort', onAbort);
      }
    },
    enabled: enabled && !!clientId,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: 800,
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

// Interface for materialized view RPC response
interface TeacherChatThreadMV {
  teacher_id: string;
  client_id: string;
  client_name: string;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  client_phone: string | null;
  client_branch: string | null;
  telegram_chat_id: string | null;
  whatsapp_chat_id: string | null;
  last_message: string | null;
  last_messenger: string | null;
  last_message_time: string | null;
  unread_count: number;
  unread_whatsapp: number;
  unread_telegram: number;
  unread_max: number;
}

/**
 * Hook to load all teachers from teachers table with their chat data
 * Uses materialized view for fast loading with fallback to legacy RPC
 */
export const useTeacherChats = (branch?: string | null) => {
  const queryClient = useQueryClient();

  // Try to use materialized view first, fallback to legacy approach
  const { data: mvThreads, isLoading: mvLoading, error: mvError } = useQuery({
    queryKey: ['teacher-chats', 'threads-mv'],
    queryFn: async () => {
      const metricId = startMetric('teacher-chat-threads-mv');
      
      try {
        // Try materialized view RPC first (super fast ~5-10ms)
        const { data, error } = await supabase.rpc('get_teacher_chat_threads_fast', { 
          p_limit: 200 
        });

        if (error) {
          // If MV RPC doesn't exist yet, will fallback below
          if (error.code === 'PGRST202' || error.message?.includes('does not exist')) {
            console.warn('[useTeacherChats] MV RPC not available, will use legacy');
            endMetric(metricId, 'completed', { fallback: true });
            return null; // Signal to use fallback
          }
          throw error;
        }

        endMetric(metricId, 'completed', { count: (data || []).length });
        return (data || []) as TeacherChatThreadMV[];
      } catch (err) {
        console.warn('[useTeacherChats] MV query failed:', err);
        endMetric(metricId, 'failed');
        return null;
      }
    },
    staleTime: 15000, // 15 seconds - MV is fast, can refresh more often
    retry: false, // Don't retry - fallback will handle it
  });

  // Fallback: Fetch teachers + unread counts separately (legacy approach)
  const useLegacy = mvThreads === null || !!mvError;

  // Define teacher type for legacy query
  type TeacherRow = {
    id: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    email: string | null;
    branch: string | null;
    subjects: string[] | null;
    categories: string[] | null;
    is_active: boolean | null;
  };

  const { data: teachers, isLoading: teachersLoading, error: teachersError } = useQuery({
    queryKey: ['teacher-chats', 'teachers', branch],
    queryFn: async (): Promise<TeacherRow[]> => {
      let query = supabase
        .from('teachers')
        .select('id, first_name, last_name, phone, email, branch, subjects, categories, is_active')
        .eq('is_active', true)
        .order('last_name', { ascending: true });

      if (branch) {
        query = query.eq('branch', branch);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as TeacherRow[];
    },
    staleTime: 30000,
    enabled: useLegacy, // Only fetch if MV not available
  });

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
    staleTime: 10000,
    enabled: useLegacy && !!(teachers?.length), // Only if using legacy
  });

  // Combine data from MV or legacy approach
  const teacherChats = useMemo<TeacherChatItem[]>(() => {
    // If using materialized view, map directly
    if (mvThreads && mvThreads.length > 0) {
      return mvThreads.map((thread) => ({
        id: thread.teacher_id,
        firstName: thread.first_name || '',
        lastName: thread.last_name || '',
        fullName: thread.client_name || `${thread.last_name || ''} ${thread.first_name || ''}`.trim() || 'Преподаватель',
        phone: thread.client_phone,
        email: null,
        branch: thread.client_branch || '',
        subjects: null,
        categories: null,
        isActive: true,
        clientId: thread.client_id,
        unreadMessages: thread.unread_count || 0,
        lastMessageTime: thread.last_message_time,
        lastMessageText: thread.last_message,
        lastMessengerType: thread.last_messenger,
        lastSeen: thread.last_message_time 
          ? new Date(thread.last_message_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
          : 'нет сообщений',
        isOnline: false,
      }));
    }

    // Legacy approach: combine teachers with unread counts
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
        isActive: teacher.is_active ?? true,
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
  }, [mvThreads, teachers, unreadCounts]);

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

  // Determine total teachers count from MV or legacy
  const totalTeachersCount = mvThreads?.length || teachers?.length || 0;

  return {
    teachers: sortedTeachers,
    totalTeachers: totalTeachersCount,
    totalUnread,
    isLoading: mvLoading || (useLegacy && (teachersLoading || unreadLoading)),
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
