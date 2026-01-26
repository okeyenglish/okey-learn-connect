import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useEffect, useMemo } from 'react';
import { normalizePhone } from '@/utils/phoneNormalization';
import { startMetric, endMetric } from '@/lib/performanceMetrics';

// Cache normalized phone -> clientId to avoid repeated lookups (huge perf win on large clients table)
const teacherClientIdByPhoneCache = new Map<string, string>();

// In-memory cache: whether the current user is allowed to use direct chat_messages fallback
let allowDirectTeacherMessagesFallback: boolean | null = null;

const getAllowDirectTeacherMessagesFallback = async (): Promise<boolean> => {
  if (allowDirectTeacherMessagesFallback !== null) return allowDirectTeacherMessagesFallback;

  try {
    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr) {
      allowDirectTeacherMessagesFallback = false;
      return allowDirectTeacherMessagesFallback;
    }

    const uid = u.user?.id;
    if (!uid) {
      allowDirectTeacherMessagesFallback = false;
      return allowDirectTeacherMessagesFallback;
    }

    const { data: roles, error: rolesErr } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', uid);

    if (rolesErr) {
      allowDirectTeacherMessagesFallback = false;
      return allowDirectTeacherMessagesFallback;
    }

    const allowed = (roles || []).some((r: any) =>
      ['admin', 'manager', 'branch_manager', 'accountant'].includes(String(r.role))
    );
    allowDirectTeacherMessagesFallback = allowed;
    return allowDirectTeacherMessagesFallback;
  } catch {
    allowDirectTeacherMessagesFallback = false;
    return allowDirectTeacherMessagesFallback;
  }
};

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
      const MESSAGE_LIMIT = 200;

      // Strategy: Try RPC first with short timeout, then fallback to direct SELECT
      const TIMEOUT_MS = 5_000; // 5 seconds max for RPC
      
      const rpcWithTimeout = async (): Promise<{ data: unknown[] | null; error: Error | null }> => {
        return new Promise((resolve) => {
          const timeoutId = setTimeout(() => {
            console.warn('[useTeacherChatMessages] RPC timeout, falling back to direct query');
            resolve({ data: null, error: new Error('RPC timeout') });
          }, TIMEOUT_MS);

          // Try RPC
          (async () => {
            try {
              const { data, error } = await supabase.rpc('get_teacher_chat_messages', { 
                p_client_id: clientId,
                p_limit: MESSAGE_LIMIT 
              });
              
              clearTimeout(timeoutId);
              
              if (error) {
                // Fallback to legacy signature if p_limit not supported
                if (error.message?.includes('p_limit') || error.code === 'PGRST202') {
                  const { data: legacyData, error: legacyError } = await supabase.rpc(
                    'get_teacher_chat_messages', 
                    { p_client_id: clientId }
                  );
                  if (legacyError) {
                    resolve({ data: null, error: legacyError });
                  } else {
                    resolve({ data: (legacyData || []).slice(-MESSAGE_LIMIT), error: null });
                  }
                  return;
                }
                resolve({ data: null, error });
              } else {
                resolve({ data: data || [], error: null });
              }
            } catch (err) {
              clearTimeout(timeoutId);
              resolve({ data: null, error: err as Error });
            }
          })();
        });
      };

      try {
        // First attempt: RPC with timeout
        const rpcResult = await rpcWithTimeout();

        // IMPORTANT:
        // Some SECURITY DEFINER RPCs may legally return an empty set (e.g. access check fails)
        // which is indistinguishable from "no messages".
        // For admin/manager roles we prefer to fallback to direct SELECT when RPC returns 0 rows.
        if (Array.isArray(rpcResult.data) && rpcResult.data.length > 0) {
          endMetric(metricId, 'completed', { msgCount: rpcResult.data.length, method: 'rpc' });
          return rpcResult.data;
        }

        const canFallback = await getAllowDirectTeacherMessagesFallback();
        if (!canFallback) {
          // Respect restricted roles (e.g. teacher) — do not fallback to broad SELECT.
          endMetric(metricId, 'completed', { msgCount: 0, method: 'rpc_empty_no_fallback' });
          return [];
        }

        // Second attempt: Direct SELECT (faster for teacher chats, bypasses complex RPC)
        console.log('[useTeacherChatMessages] Trying direct chat_messages select for:', clientId);
        
        const { data: directData, error: directError } = await supabase
          .from('chat_messages')
          .select(
            'id, client_id, message_text, content, message_type, system_type, is_read, is_outgoing, created_at, file_url, media_url, file_name, file_type, media_type, external_message_id, external_id, messenger_type, messenger, call_duration, message_status, status, metadata'
          )
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(MESSAGE_LIMIT);

        if (!directError && directData) {
          console.log('[useTeacherChatMessages] Direct query succeeded:', directData.length, 'messages');
          endMetric(metricId, 'completed', { msgCount: directData.length, method: 'direct' });
          // Normalize field names for compatibility
          return directData.map((m: Record<string, unknown>) => ({
            ...m,
            message_text: m.message_text || m.content || '',
            file_url: m.file_url || m.media_url,
            file_type: m.file_type || m.media_type,
            external_message_id: m.external_message_id || m.external_id,
            messenger_type: m.messenger_type || m.messenger,
            message_status: m.message_status || m.status,
          }));
        }

        console.error('[useTeacherChatMessages] Direct select also failed:', directError);
        endMetric(metricId, 'failed', { error: String(directError || rpcResult.error) });
        
        // Return empty array instead of throwing to prevent UI error state
        return [];
      } catch (err) {
        console.error('[useTeacherChatMessages] All methods failed:', err);
        endMetric(metricId, 'failed', { error: String(err) });
        return [];
      }
    },
    enabled: enabled && !!clientId,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 0, // Don't retry - we already have fallback logic
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
 * NOTE: This hook is used by the CRM "Преподаватели" system chat and must show
 * teacher roster (from `teachers`), not teacher→client threads.
 */
export const useTeacherChats = (branch?: string | null) => {
  const queryClient = useQueryClient();

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
    enabled: true,
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
    enabled: !!(teachers?.length),
  });

  // Combine data from MV or legacy approach
  const teacherChats = useMemo<TeacherChatItem[]>(() => {
    // Combine teachers with unread counts
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

  // Determine total teachers count from MV or legacy
  const totalTeachersCount = teachers?.length || 0;

  return {
    teachers: sortedTeachers,
    totalTeachers: totalTeachersCount,
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
