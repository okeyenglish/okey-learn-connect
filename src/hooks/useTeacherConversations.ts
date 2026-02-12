/**
 * Hook to fetch teacher conversations - optimized with RPC + fallback
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useMemo, useEffect } from 'react';
import { SELF_HOSTED_URL, SELF_HOSTED_ANON_KEY, getAuthToken } from '@/lib/selfHostedApi';

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

// Cache RPC availability to avoid repeated 404s
let rpcAvailable: boolean | null = null;

/**
 * Try RPC call to get_teacher_chat_threads_fast on self-hosted server
 */
async function fetchViaRPC(token: string): Promise<TeacherConversation[] | null> {
  if (rpcAvailable === false) return null;

  try {
    const res = await fetch(
      `${SELF_HOSTED_URL}/rest/v1/rpc/get_teacher_chat_threads_fast`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SELF_HOSTED_ANON_KEY,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ p_limit: 200 }),
      }
    );

    if (!res.ok) {
      if (res.status === 404 || res.status === 400) {
        console.warn('[useTeacherConversations] RPC not available, using fallback');
        rpcAvailable = false;
        return null;
      }
      // Check for "function does not exist" in body
      const text = await res.text();
      if (text.includes('does not exist') || text.includes('not found')) {
        rpcAvailable = false;
        return null;
      }
      console.error('[useTeacherConversations] RPC error:', res.status, text);
      return null;
    }

    rpcAvailable = true;
    const rows: any[] = await res.json();

    return rows.map((r: any) => ({
      teacherId: r.teacher_id,
      teacherName: `${r.last_name || ''} ${r.first_name || ''}`.trim() || 'Преподаватель',
      teacherFirstName: r.first_name || '',
      teacherLastName: r.last_name || '',
      teacherPhone: r.client_phone || null,
      teacherEmail: null,
      teacherBranch: r.client_branch || null,
      lastMessageTime: r.last_message_time || null,
      lastMessageText: r.last_message || null,
      lastMessengerType: r.last_messenger || null,
      unreadCount: r.unread_count || 0,
      avatarUrl: null,
    }));
  } catch (err) {
    console.error('[useTeacherConversations] RPC fetch error:', err);
    return null;
  }
}

/**
 * Optimized fallback: fetch teachers + 1 last message per teacher + unread counts
 */
async function fetchFallback(branch?: string | null): Promise<TeacherConversation[]> {
  // Step 1: Get teachers
  const { data: teachers, error: teachersError } = await supabase
    .from('teachers')
    .select('id, first_name, last_name, phone, email, branch, is_active')
    .eq('is_active', true)
    .order('last_name', { ascending: true });

  if (teachersError) throw teachersError;
  if (!teachers?.length) return [];

  const filteredTeachers = branch
    ? teachers.filter(t => t.branch === branch)
    : teachers;

  const teacherIds = filteredTeachers.map(t => t.id);
  if (!teacherIds.length) return [];

  // Step 2: Get ONLY the last message per teacher (much lighter than 50 per teacher)
  // Single query, limited to 1 per teacher via client-side dedup
  const { data: lastMessages } = await (supabase
    .from('chat_messages') as any)
    .select('teacher_id, created_at, message_text, messenger_type, is_outgoing')
    .in('teacher_id', teacherIds)
    .order('created_at', { ascending: false })
    .limit(teacherIds.length * 3); // Small buffer for dedup

  // Step 3: Get unread counts only (very light query)
  const { data: unreadMessages } = await (supabase
    .from('chat_messages') as any)
    .select('teacher_id')
    .in('teacher_id', teacherIds)
    .eq('is_read', false)
    .eq('is_outgoing', false)
    .limit(1000);

  // Build maps
  const lastMsgMap = new Map<string, any>();
  (lastMessages || []).forEach((msg: any) => {
    if (msg.teacher_id && !lastMsgMap.has(msg.teacher_id)) {
      lastMsgMap.set(msg.teacher_id, msg);
    }
  });

  const unreadCountMap = new Map<string, number>();
  (unreadMessages || []).forEach((msg: any) => {
    if (msg.teacher_id) {
      unreadCountMap.set(msg.teacher_id, (unreadCountMap.get(msg.teacher_id) || 0) + 1);
    }
  });

  // Combine
  const conversations: TeacherConversation[] = filteredTeachers
    .map(teacher => {
      const lastMsg = lastMsgMap.get(teacher.id);
      const unreadCount = unreadCountMap.get(teacher.id) || 0;

      return {
        teacherId: teacher.id,
        teacherName: `${teacher.last_name || ''} ${teacher.first_name || ''}`.trim() || 'Преподаватель',
        teacherFirstName: teacher.first_name || '',
        teacherLastName: teacher.last_name || '',
        teacherPhone: teacher.phone,
        teacherEmail: teacher.email,
        teacherBranch: teacher.branch,
        lastMessageTime: lastMsg?.created_at || null,
        lastMessageText: lastMsg?.message_text || null,
        lastMessengerType: lastMsg?.messenger_type || null,
        unreadCount,
        avatarUrl: null,
      };
    })
    .filter(c => c.lastMessageTime !== null);

  // Sort: unread first, then by time
  return conversations.sort((a, b) => {
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
    const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
    const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
    return timeB - timeA;
  });
}

export const useTeacherConversations = (branch?: string | null) => {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['teacher-conversations', branch],
    queryFn: async (): Promise<TeacherConversation[]> => {
      // Try RPC first (single fast query via materialized view)
      const token = await getAuthToken();
      if (token) {
        const rpcResult = await fetchViaRPC(token);
        if (rpcResult) {
          console.log(`[useTeacherConversations] RPC returned ${rpcResult.length} conversations`);
          // Apply branch filter client-side if needed
          const filtered = branch
            ? rpcResult.filter(c => c.teacherBranch === branch)
            : rpcResult;
          return filtered;
        }
      }

      // Fallback: optimized direct queries
      console.log('[useTeacherConversations] Using optimized fallback');
      return fetchFallback(branch);
    },
    staleTime: 60000, // 60s (MV refreshes every 2 min)
    gcTime: 5 * 60 * 1000,
  });

  // Real-time subscription
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null;

    const debouncedRefetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['teacher-conversations'] });
        debounceTimer = null;
      }, 300);
    };

    const channel = supabase
      .channel('teacher-conversations-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const rec = payload.new as Record<string, unknown>;
          if (rec?.teacher_id) debouncedRefetch();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const rec = payload.new as Record<string, unknown>;
          if (rec?.teacher_id) debouncedRefetch();
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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
