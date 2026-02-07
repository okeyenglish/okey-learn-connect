import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useEffect, useMemo } from 'react';
import { normalizePhone } from '@/utils/phoneNormalization';
import { startMetric, endMetric } from '@/lib/performanceMetrics';
import { getCachedUserId } from '@/lib/authHelpers';

// Cache normalized phone -> clientId to avoid repeated lookups (huge perf win on large clients table)
const teacherClientIdByPhoneCache = new Map<string, string>();

// In-memory cache: whether the current user is allowed to use direct chat_messages fallback
let allowDirectTeacherMessagesFallback: boolean | null = null;

const getAllowDirectTeacherMessagesFallback = async (): Promise<boolean> => {
  if (allowDirectTeacherMessagesFallback !== null) return allowDirectTeacherMessagesFallback;

  try {
    const uid = await getCachedUserId();
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
        
        // Self-hosted schema: NO columns: direction, content, sender_id, sender_name, read_at, reply_to_id, media_url, media_type, external_id
        const { data: directData, error: directError } = await supabase
          .from('chat_messages')
          .select(
            'id, client_id, message_text, message_type, system_type, is_read, is_outgoing, created_at, file_url, file_name, file_type, external_message_id, messenger_type, call_duration, message_status, metadata'
          )
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(MESSAGE_LIMIT);

        if (!directError && directData) {
          console.log('[useTeacherChatMessages] Direct query succeeded:', directData.length, 'messages');
          endMetric(metricId, 'completed', { msgCount: directData.length, method: 'direct' });
          // Normalize field names for compatibility (self-hosted: message_text, is_outgoing)
          return directData.map((m: Record<string, unknown>) => ({
            ...m,
            message_text: m.message_text || '',
            content: m.message_text || '', // Alias for Cloud compat
            file_url: m.file_url,
            file_type: m.file_type,
            external_message_id: m.external_message_id,
            messenger_type: m.messenger_type,
            message_status: m.message_status,
            is_outgoing: m.is_outgoing ?? false,
            direction: m.is_outgoing ? 'outgoing' : 'incoming', // Alias for Cloud compat
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
  profileId: string | null; // profile_id linking to profiles/auth.users for internal_staff_messages
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
    profile_id: string | null;
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
        .select('id, profile_id, first_name, last_name, phone, email, branch, subjects, categories, is_active')
        .eq('is_active', true)
        .order('last_name', { ascending: true });

      if (branch) {
        query = query.eq('branch', branch);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as TeacherRow[];
    },
    staleTime: 60000, // 1 minute - teachers rarely change
    gcTime: 10 * 60 * 1000,
    enabled: true,
  });

  // Load unread counts in parallel (not dependent on teachers)
  const { data: unreadCounts, isLoading: unreadLoading } = useQuery({
    queryKey: ['teacher-chats', 'unread-counts'],
    queryFn: async (): Promise<TeacherUnreadCount[]> => {
      // Try RPC first
      const { data, error } = await supabase.rpc('get_teacher_unread_counts');
      
      // If RPC works and returns data, use it
      if (!error && data && data.length > 0) {
        return data as TeacherUnreadCount[];
      }
      
      // Fallback: Direct query for self-hosted environments without the RPC function
      console.log('[useTeacherChats] RPC returned empty, using direct query fallback');
      
      try {
        // Get teachers with their phone numbers
        const { data: teachersList } = await supabase
          .from('teachers')
          .select('id, phone')
          .eq('is_active', true);
        
        if (!teachersList?.length) return [];
        
        // =============================================================
        // STEP 1: Try direct teacher_id query (new self-hosted architecture)
        // Messages are stored directly with teacher_id, not via clients table
        // =============================================================
        const teacherIds = teachersList.map(t => t.id);
        
        // @ts-ignore - teacher_id column exists in self-hosted schema
        // Self-hosted uses message_text only (no content column)
        const { data: directMessages, error: directError } = await (supabase
          .from('chat_messages') as any)
          .select('teacher_id, message_text, created_at, messenger_type, messenger, is_read, is_outgoing')
          .in('teacher_id', teacherIds)
          .order('created_at', { ascending: false })
          .limit(teacherIds.length * 20); // ~20 сообщений на преподавателя для превью
        
        // Handle potential missing column (42703) gracefully
        if (directError) {
          if (directError.code === '42703') {
            console.log('[useTeacherChats] teacher_id column not found, falling back to client matching');
          } else {
            console.warn('[useTeacherChats] Direct teacher_id query error:', directError);
          }
        }
        
        // If direct query works and returns data, use it
        if (!directError && directMessages && directMessages.length > 0) {
          console.log('[useTeacherChats] Found messages via teacher_id:', directMessages.length);
          
          // Group messages by teacher_id
          const messagesByTeacher = new Map<string, any[]>();
          directMessages.forEach((msg: any) => {
            if (!msg.teacher_id) return;
            if (!messagesByTeacher.has(msg.teacher_id)) {
              messagesByTeacher.set(msg.teacher_id, []);
            }
            messagesByTeacher.get(msg.teacher_id)!.push(msg);
          });
          
          // Build results from grouped messages
          const directResults: TeacherUnreadCount[] = [];
          teachersList.forEach(teacher => {
            const messages = messagesByTeacher.get(teacher.id);
            if (messages && messages.length > 0) {
              const lastMsg = messages[0]; // Already sorted desc
              const unreadCount = messages.filter((m: any) => 
                !m.is_read && (m.is_outgoing === false)
              ).length;
              
              directResults.push({
                teacher_id: teacher.id,
                client_id: `teacher:${teacher.id}`, // Special marker for direct teacher messages
                unread_count: unreadCount,
                last_message_time: lastMsg.created_at,
                last_message_text: lastMsg.message_text || null,
                last_messenger_type: lastMsg.messenger_type || lastMsg.messenger || null,
              });
            }
          });
          
          if (directResults.length > 0) {
            console.log('[useTeacherChats] Direct teacher_id query returned', directResults.length, 'conversations');
            return directResults;
          }
        }
        
        console.log('[useTeacherChats] No messages via teacher_id, falling back to client matching...');
        // =============================================================
        // STEP 2: Fallback to client matching by phone (legacy architecture)
        // =============================================================
        
        // Get all clients that might be linked to teachers (by phone pattern or name prefix)
        const { data: teacherClients } = await supabase
          .from('clients')
          .select('id, phone, name')
          .or('name.ilike.Преподаватель:%,name.ilike.%педагог%')
          .limit(500);
        
        if (!teacherClients?.length) {
          // Try matching by phone instead
          const phones = teachersList.map(t => t.phone).filter(Boolean);
          if (phones.length === 0) return [];
          
          const { data: phoneClients } = await supabase
            .from('clients')
            .select('id, phone')
            .not('phone', 'is', null)
            .limit(1000);
          
          if (!phoneClients?.length) return [];
          
          // Match teachers to clients by normalized phone
          const results: TeacherUnreadCount[] = [];
          for (const teacher of teachersList) {
            if (!teacher.phone) continue;
            const teacherNorm = normalizePhone(teacher.phone);
            if (!teacherNorm) continue;
            
            const matchedClient = phoneClients.find(c => 
              c.phone && normalizePhone(c.phone) === teacherNorm
            );
            
            if (matchedClient) {
              // Get last message and unread count for this client
              // Self-hosted uses message_text only (no content column)
              const { data: lastMsg } = await supabase
                .from('chat_messages')
                .select('message_text, created_at, messenger_type, messenger, is_read, is_outgoing')
                .eq('client_id', matchedClient.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              
              const { count: unreadCount } = await supabase
                .from('chat_messages')
                .select('id', { count: 'exact', head: true })
                .eq('client_id', matchedClient.id)
                .eq('is_outgoing', false)
                .eq('is_read', false);
              
              results.push({
                teacher_id: teacher.id,
                client_id: matchedClient.id,
                unread_count: unreadCount || 0,
                last_message_time: lastMsg?.created_at || null,
                last_message_text: lastMsg?.message_text || null,
                last_messenger_type: lastMsg?.messenger_type || lastMsg?.messenger || null,
              });
            }
          }
          
          return results;
        }
        
        // Match by name prefix "Преподаватель: ..."
        const results: TeacherUnreadCount[] = [];
        for (const teacher of teachersList) {
          // Try to find by phone first
          let matchedClient = null;
          if (teacher.phone) {
            const teacherNorm = normalizePhone(teacher.phone);
            if (teacherNorm) {
              matchedClient = teacherClients.find(c => 
                c.phone && normalizePhone(c.phone) === teacherNorm
              );
            }
          }
          
          if (matchedClient) {
            // Get last message info
            // Self-hosted uses message_text only (no content column)
            const { data: lastMsg } = await supabase
              .from('chat_messages')
              .select('message_text, created_at, messenger_type, messenger, is_read, is_outgoing')
              .eq('client_id', matchedClient.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            const { count: unreadCount } = await supabase
              .from('chat_messages')
              .select('id', { count: 'exact', head: true })
              .eq('client_id', matchedClient.id)
              .eq('is_outgoing', false)
            
            results.push({
              teacher_id: teacher.id,
              client_id: matchedClient.id,
              unread_count: unreadCount || 0,
              last_message_time: lastMsg?.created_at || null,
              last_message_text: lastMsg?.message_text || null,
              last_messenger_type: lastMsg?.messenger_type || lastMsg?.messenger || null,
            });
          }
        }
        
        console.log('[useTeacherChats] Fallback found', results.length, 'teacher-client links');
        return results;
      } catch (fallbackError) {
        console.error('[useTeacherChats] Fallback query failed:', fallbackError);
        return [];
      }
    },
    staleTime: 10000,
    gcTime: 60000,
    enabled: true,
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
        profileId: teacher.profile_id || null,
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
