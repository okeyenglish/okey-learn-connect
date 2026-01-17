import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface ChatMessage {
  id: string;
  client_id: string;
  phone_number_id?: string;
  message_text: string;
  message_type: 'client' | 'manager' | 'system';
  system_type?: string;
  is_read: boolean;
  call_duration?: string;
  created_at: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  external_message_id?: string;
  whatsapp_chat_id?: string;
}

export interface UnreadByMessenger {
  whatsapp: number;
  telegram: number;
  max: number;
  email: number;
  calls: number;
}

export interface ChatThread {
  client_id: string;
  client_name: string;
  client_phone: string;
  client_branch?: string | null;
  avatar_url?: string | null;
  telegram_avatar_url?: string | null;
  whatsapp_avatar_url?: string | null;
  max_avatar_url?: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  unread_by_messenger: UnreadByMessenger;
  last_unread_messenger: string | null;
  messages: ChatMessage[];
}

export const useChatMessages = (clientId: string) => {
  const { data: messages, isLoading, error } = useQuery({
    queryKey: ['chat-messages', clientId],
    queryFn: async () => {
      // Uses idx_chat_messages_client_created index for fast queries
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!clientId,
    // Optimized caching settings
    staleTime: 30 * 1000, // Cache for 30 seconds
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on focus - use realtime instead
    placeholderData: (previousData) => previousData, // Keep showing old data while loading
  });

  return {
    messages: messages || [],
    isLoading,
    error,
  };
};

export const useChatThreads = () => {
  const { data: threads, isLoading, error } = useQuery({
    queryKey: ['chat-threads'],
    staleTime: 15 * 1000, // Cache for 15 seconds - optimized
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    queryFn: async () => {
      console.log('[useChatThreads] Fetching chat messages...');
      const startTime = performance.now();
      
      // Fetch chat messages
      // Try selecting with join to clients; if blocked by RLS, fall back to no-join select
      const selectWithJoin = `
          client_id,
          message_text,
          message_type,
          messenger_type,
          created_at,
          is_read,
          salebot_message_id,
          clients (
            id,
            name,
            phone
          )
        `;

      let messagesData: any[] | null = null;
      {
        // Limit to last 500 messages to prevent huge fetches
        const { data, error } = await supabase
          .from('chat_messages')
          .select(selectWithJoin)
          .order('created_at', { ascending: false })
          .limit(500);

        if (error) {
          console.warn('[useChatThreads] Join to clients failed, falling back:', error.message);
          const { data: noJoinData, error: noJoinError } = await supabase
            .from('chat_messages')
            .select('client_id, message_text, message_type, messenger_type, created_at, is_read, salebot_message_id')
            .order('created_at', { ascending: false })
            .limit(500);

          if (noJoinError) {
            console.error('[useChatThreads] Error fetching messages (no join):', noJoinError);
            throw noJoinError;
          }
          messagesData = noJoinData as any[];
        } else {
          messagesData = data as any[];
        }
      }
      
      console.log('[useChatThreads] Raw messages fetched:', {
        total: messagesData?.length || 0,
        withClients: messagesData?.filter((m: any) => m.clients).length || 0,
        withoutClients: messagesData?.filter((m: any) => !m.clients).length || 0,
        salebotMessages: messagesData?.filter((m: any) => m.salebot_message_id).length || 0,
        uniqueClientIds: new Set(messagesData?.map((m: any) => m.client_id)).size,
        sample: messagesData?.slice(0, 5).map((m: any) => ({
          client_id: m.client_id,
          has_client: !!m.clients,
          client_name: m.clients?.name,
          message: m.message_text?.substring(0, 30)
        }))
      });

      // Fetch call logs with safe fallback when clients join is blocked by RLS
      let callsData: any[] | null = null;
      {
        const selectCallsWithJoin = `
          client_id,
          status,
          direction,
          started_at,
          duration_seconds,
          clients (
            id,
            name,
            phone
          )
        `;
        // Limit to last 200 calls to prevent huge fetches
        const { data, error } = await supabase
          .from('call_logs')
          .select(selectCallsWithJoin)
          .order('started_at', { ascending: false })
          .limit(200);

        if (error) {
          console.warn('[useChatThreads] Calls join failed, falling back:', error.message);
          const { data: noJoinCalls, error: noJoinCallsError } = await supabase
            .from('call_logs')
            .select('client_id, status, direction, started_at, duration_seconds')
            .order('started_at', { ascending: false })
            .limit(200);

          if (noJoinCallsError) throw noJoinCallsError;
          callsData = noJoinCalls as any[];
        } else {
          callsData = data as any[];
        }
      }

      // Group interactions by client
      const threadsMap = new Map<string, ChatThread>();
      
      // Helper function to create default unread_by_messenger
      const createDefaultUnreadByMessenger = (): UnreadByMessenger => ({
        whatsapp: 0,
        telegram: 0,
        max: 0,
        email: 0,
        calls: 0,
      });
      
      // Process chat messages
      messagesData?.forEach((message: any) => {
        const clientId = message.client_id;
        const client = message.clients;
        
        // Обрабатываем даже если клиент не подтянулся из join (RLS/доступ)
        const safeClient = message.clients || { id: message.client_id, name: '', phone: '' };
        
        if (!threadsMap.has(clientId)) {
          threadsMap.set(clientId, {
            client_id: clientId,
            client_name: safeClient.name,
            client_phone: safeClient.phone,
            last_message: message.message_text,
            last_message_time: message.created_at,
            unread_count: 0,
            unread_by_messenger: createDefaultUnreadByMessenger(),
            last_unread_messenger: null,
            messages: [],
          });
        }
        
        const thread = threadsMap.get(clientId)!;
        if (new Date(message.created_at) > new Date(thread.last_message_time)) {
          thread.last_message = message.message_text;
          thread.last_message_time = message.created_at;
        }
        
        // Считаем только непрочитанные сообщения от клиентов, игнорируем сообщения менеджеров и системные
        if (!message.is_read && message.message_type === 'client') {
          thread.unread_count++;
          
          // Подсчёт по мессенджерам и отслеживание последнего непрочитанного
          const messengerType = message.messenger_type || 'whatsapp';
          const normalizedMessenger = (messengerType === 'whatsapp' || !messengerType) ? 'whatsapp' : messengerType;
          
          // Поскольку сообщения отсортированы по убыванию времени, первое непрочитанное - самое новое
          if (!thread.last_unread_messenger) {
            thread.last_unread_messenger = normalizedMessenger;
          }
          
          if (normalizedMessenger === 'whatsapp') {
            thread.unread_by_messenger.whatsapp++;
          } else if (normalizedMessenger === 'telegram') {
            thread.unread_by_messenger.telegram++;
          } else if (normalizedMessenger === 'max') {
            thread.unread_by_messenger.max++;
          } else if (normalizedMessenger === 'email') {
            thread.unread_by_messenger.email++;
          }
        }
      });

      // Process call logs
      callsData?.forEach((call: any) => {
        const clientId = call.client_id;
        const client = call.clients || { id: call.client_id, name: '', phone: '' };
        
        const callMessage = `${call.direction === 'incoming' ? '📞 Входящий' : '📱 Исходящий'} звонок (${call.status})`;
        
        if (!threadsMap.has(clientId)) {
          threadsMap.set(clientId, {
            client_id: clientId,
            client_name: client.name,
            client_phone: client.phone,
            last_message: callMessage,
            last_message_time: call.started_at,
            unread_count: call.status === 'missed' ? 1 : 0,
            unread_by_messenger: createDefaultUnreadByMessenger(),
            last_unread_messenger: call.status === 'missed' ? 'calls' : null,
            messages: [],
          });
          if (call.status === 'missed') {
            threadsMap.get(clientId)!.unread_by_messenger.calls = 1;
          }
        } else {
          const thread = threadsMap.get(clientId)!;
          if (new Date(call.started_at) > new Date(thread.last_message_time)) {
            thread.last_message = callMessage;
            thread.last_message_time = call.started_at;
          }
          if (call.status === 'missed') {
            thread.unread_count++;
            thread.unread_by_messenger.calls++;
          }
        }
      });

      // Refresh client names from clients table to ensure latest display names
      const clientIds = Array.from(threadsMap.keys());
      if (clientIds.length > 0) {
        // Fetch clients with their primary phone numbers
        const [{ data: freshClients, error: freshClientsError }, { data: primaryPhones, error: phonesError }] = await Promise.all([
          supabase
            .from('clients')
            .select('id, name, phone')
            .in('id', clientIds),
          supabase
            .from('client_phone_numbers')
            .select('client_id, phone')
            .in('client_id', clientIds)
            .eq('is_primary', true)
        ]);
        
        if (!freshClientsError && freshClients) {
          const freshMap = new Map(freshClients.map((c: any) => [c.id, c]));
          const phonesMap = new Map((primaryPhones || []).map((p: any) => [p.client_id, p.phone]));
          
          threadsMap.forEach((thread, id) => {
            const fresh = freshMap.get(id);
            const primaryPhone = phonesMap.get(id);
            if (fresh) {
              thread.client_name = fresh.name ?? thread.client_name;
              // Use clients.phone first, fallback to primary phone from client_phone_numbers
              thread.client_phone = fresh.phone || primaryPhone || thread.client_phone;
            }
          });
        }
      }

      const finalThreads = Array.from(threadsMap.values())
        .sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime());
      
      const endTime = performance.now();
      console.log('[useChatThreads] Threads created from messages:', {
        totalThreads: finalThreads.length,
        executionTime: `${(endTime - startTime).toFixed(2)}ms`,
        threadsWithNames: finalThreads.filter(t => t.client_name).length,
        threadsWithoutNames: finalThreads.filter(t => !t.client_name).length,
        sample: finalThreads.slice(0, 5).map(t => ({
          id: t.client_id,
          name: t.client_name || '(no name)',
          lastMsg: t.last_message?.substring(0, 30)
        }))
      });
      
      return finalThreads;
    },
  });

  console.log('[useChatThreads] Returning threads:', {
    count: threads?.length || 0,
    isLoading,
    hasError: !!error,
    sample: threads?.slice(0, 3).map(t => ({
      id: t.client_id,
      name: t.client_name,
      lastMsg: t.last_message?.substring(0, 30)
    }))
  });

  return {
    threads: threads || [],
    isLoading,
    error,
  };
};

// Hook to get unread counts by messenger for a specific client
export const useClientUnreadByMessenger = (clientId: string) => {
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['client-unread-by-messenger', clientId],
    queryFn: async (): Promise<{ counts: UnreadByMessenger; lastUnreadMessenger: string | null }> => {
      if (!clientId) {
        return { counts: { whatsapp: 0, telegram: 0, max: 0, email: 0, calls: 0 }, lastUnreadMessenger: null };
      }

      // Fetch unread messages by messenger type with created_at to find the latest
      const { data: messages, error: msgError } = await supabase
        .from('chat_messages')
        .select('messenger_type, created_at')
        .eq('client_id', clientId)
        .eq('is_read', false)
        .eq('message_type', 'client')
        .order('created_at', { ascending: false });

      if (msgError) {
        console.error('[useClientUnreadByMessenger] Error:', msgError);
        throw msgError;
      }

      const counts: UnreadByMessenger = { whatsapp: 0, telegram: 0, max: 0, email: 0, calls: 0 };
      let lastUnreadMessenger: string | null = null;
      let latestUnreadTime: Date | null = null;

      messages?.forEach((msg: any) => {
        const messengerType = msg.messenger_type || 'whatsapp';
        const msgTime = new Date(msg.created_at);

        if (!latestUnreadTime || msgTime > latestUnreadTime) {
          latestUnreadTime = msgTime;
          lastUnreadMessenger = messengerType === 'whatsapp' || !messengerType ? 'whatsapp' : messengerType;
        }

        if (messengerType === 'whatsapp' || !messengerType) {
          counts.whatsapp++;
        } else if (messengerType === 'telegram') {
          counts.telegram++;
        } else if (messengerType === 'max') {
          counts.max++;
        } else if (messengerType === 'email') {
          counts.email++;
        }
      });

      // Fetch missed calls
      const { data: calls, error: callsError } = await supabase
        .from('call_logs')
        .select('id, started_at')
        .eq('client_id', clientId)
        .eq('status', 'missed')
        .order('started_at', { ascending: false });

      if (!callsError && calls) {
        counts.calls = calls.length;
        // Check if latest missed call is newer than latest unread message
        if (calls.length > 0) {
          const latestCallTime = new Date(calls[0].started_at);
          if (!latestUnreadTime || latestCallTime > latestUnreadTime) {
            lastUnreadMessenger = 'calls';
          }
        }
      }

      return { counts, lastUnreadMessenger };
    },
    enabled: !!clientId,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  return {
    unreadCounts: data?.counts || { whatsapp: 0, telegram: 0, max: 0, email: 0, calls: 0 },
    lastUnreadMessenger: data?.lastUnreadMessenger || null,
    isLoading,
    isFetching,
    error,
  };
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      clientId,
      messageText,
      messageType = 'manager',
      phoneNumberId
    }: {
      clientId: string;
      messageText: string;
      messageType?: 'client' | 'manager' | 'system';
      phoneNumberId?: string;
    }) => {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([{
          client_id: clientId,
          phone_number_id: phoneNumberId,
          message_text: messageText,
          message_type: messageType,
          is_read: messageType === 'manager', // Manager messages are marked as read
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', data.client_id] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
    },
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('client_id', clientId)
        .eq('is_read', false);
      
      if (error) throw error;
    },
    onSuccess: (_, clientId) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', clientId] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
    },
  });
};

export const useRealtimeMessages = (clientId: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!clientId) return;

    const channel = supabase
      .channel('chat-messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          // Only invalidate specific chat messages, not the entire chat-threads list
          // chat-threads is already updated by debounced subscription in CRM.tsx
          queryClient.invalidateQueries({ queryKey: ['chat-messages', clientId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          // Only invalidate specific chat messages, not the entire chat-threads list
          queryClient.invalidateQueries({ queryKey: ['chat-messages', clientId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, queryClient]);
};

// Mark all client messages as unread for a chat
export const useMarkAsUnread = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_read: false })
        .eq('client_id', clientId);
      if (error) throw error;
    },
    onSuccess: (_,_clientId) => {
      const clientId = _clientId as unknown as string;
      queryClient.invalidateQueries({ queryKey: ['chat-messages', clientId] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
    }
  });
};