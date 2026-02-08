import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUnviewedMissedCallsCount } from './useViewedMissedCalls';

export interface ChatMessage {
  id: string;
  client_id: string;
  phone_number_id?: string;
  message_text: string;
  message_type: 'client' | 'manager' | 'system';
  system_type?: string;
  is_read: boolean;
  /** Self-hosted: incoming/outgoing flag (incoming = false) */
  is_outgoing?: boolean | null;
  call_duration?: string;
  created_at: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  external_message_id?: string;
  whatsapp_chat_id?: string;
  messenger_type?: 'whatsapp' | 'telegram' | 'max' | 'chatos' | null;
  message_status?: 'sent' | 'delivered' | 'read' | 'queued' | null;
  metadata?: Record<string, unknown> | null;
}

export interface UnreadByMessenger {
  whatsapp: number;
  telegram: number;
  max: number;
  chatos: number;
  email: number;
  calls: number;
}

export interface ChatThread {
  client_id: string;
  client_name: string;
  first_name?: string | null;
  last_name?: string | null;
  middle_name?: string | null;
  client_phone: string;
  client_branch?: string | null;
  avatar_url?: string | null;
  telegram_avatar_url?: string | null;
  whatsapp_avatar_url?: string | null;
  max_avatar_url?: string | null;
  telegram_chat_id?: string | null;
  whatsapp_chat_id?: string | null;
  max_chat_id?: string | null;
  last_message: string;
  last_message_time: string;
  last_message_messenger: string | null;
  unread_count: number;
  unread_by_messenger: UnreadByMessenger;
  last_unread_messenger: string | null;
  messages: ChatMessage[];
  /** True when client has an unacknowledged payment */
  has_pending_payment?: boolean;
}

interface MessageWithClient {
  client_id: string;
  message_text: string;
  message_type: string;
  messenger_type?: string | null;
  created_at: string;
  is_read: boolean;
  is_outgoing?: boolean | null;
  salebot_message_id?: string | null;
  clients?: {
    id: string;
    name: string | null;
    phone: string | null;
  } | null;
}

interface CallLogRow {
  client_id: string;
  status: string;
  direction: string;
  started_at: string;
  duration_seconds: number | null;
  clients?: {
    id: string;
    name: string | null;
    phone: string | null;
  } | null;
}

interface ClientRow {
  id: string;
  name: string | null;
  phone: string | null;
}

interface PhoneRow {
  client_id: string;
  phone: string;
}

interface UnreadMessageRow {
  messenger_type?: string | null;
  created_at: string;
  is_outgoing?: boolean | null;
}

interface CallLogIdRow {
  id: string;
  started_at: string;
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
          is_outgoing,
          created_at,
          is_read,
          salebot_message_id,
          clients (
            id,
            name,
            phone
          )
        `;

      let messagesData: MessageWithClient[] = [];
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
             .select('client_id, message_text, message_type, messenger_type, is_outgoing, created_at, is_read, salebot_message_id')
            .order('created_at', { ascending: false })
            .limit(500);

          if (noJoinError) {
            console.error('[useChatThreads] Error fetching messages (no join):', noJoinError);
            throw noJoinError;
          }
          messagesData = (noJoinData || []) as MessageWithClient[];
        } else {
          messagesData = (data || []) as unknown as MessageWithClient[];
        }
      }
      
      console.log('[useChatThreads] Raw messages fetched:', {
        total: messagesData.length,
        withClients: messagesData.filter((m) => m.clients).length,
        withoutClients: messagesData.filter((m) => !m.clients).length,
        salebotMessages: messagesData.filter((m) => m.salebot_message_id).length,
        uniqueClientIds: new Set(messagesData.map((m) => m.client_id)).size,
        sample: messagesData.slice(0, 5).map((m) => ({
          client_id: m.client_id,
          has_client: !!m.clients,
          client_name: m.clients?.name,
          message: m.message_text?.substring(0, 30)
        }))
      });

      // Fetch call logs from self-hosted API
      let callsData: CallLogRow[] = [];
      try {
        const callsResponse = await selfHostedPost<{
          success: boolean;
          calls: Array<{
            client_id: string;
            status: string;
            direction: string;
            started_at: string;
            duration_seconds: number | null;
            clients?: { id: string; name: string | null; phone: string | null } | null;
          }>;
        }>('get-call-logs', { action: 'list', limit: 200 });

        if (callsResponse.success && callsResponse.data?.calls) {
          callsData = callsResponse.data.calls as CallLogRow[];
        }
      } catch (callsError) {
        console.warn('[useChatThreads] Failed to fetch calls from self-hosted:', callsError);
      }

      // Group interactions by client
      const threadsMap = new Map<string, ChatThread>();
      
      // Helper function to create default unread_by_messenger
      const createDefaultUnreadByMessenger = (): UnreadByMessenger => ({
        whatsapp: 0,
        telegram: 0,
        max: 0,
        chatos: 0,
        email: 0,
        calls: 0,
      });
      
      // Process chat messages
      messagesData.forEach((message) => {
        const clientId = message.client_id;
        
        // Обрабатываем даже если клиент не подтянулся из join (RLS/доступ)
        const safeClient = message.clients || { id: message.client_id, name: '', phone: '' };
        
        const messengerOfMessage = message.messenger_type || 'whatsapp';
        
        if (!threadsMap.has(clientId)) {
          threadsMap.set(clientId, {
            client_id: clientId,
            client_name: safeClient.name || '',
            client_phone: safeClient.phone || '',
            last_message: message.message_text,
            last_message_time: message.created_at,
            last_message_messenger: messengerOfMessage,
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
          thread.last_message_messenger = messengerOfMessage;
        }
        
        // Считаем только непрочитанные ВХОДЯЩИЕ сообщения (от клиентов), игнорируем исходящие/системные
        const anyMsg = message as unknown as Record<string, any>;
        const isIncoming = anyMsg.is_outgoing === false || message.message_type === 'client';
        const isSystemLikeText = typeof message.message_text === 'string' && /^crm_system_/i.test(message.message_text);
        const isSystemRow = message.message_type === 'system' || message.messenger_type === 'system' || isSystemLikeText;

        if (!message.is_read && isIncoming && !isSystemRow) {
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
      callsData.forEach((call) => {
        const clientId = call.client_id;
        const client = call.clients || { id: call.client_id, name: '', phone: '' };
        
        const callMessage = `${call.direction === 'incoming' ? '📞 Входящий' : '📱 Исходящий'} звонок (${call.status})`;
        
        if (!threadsMap.has(clientId)) {
          threadsMap.set(clientId, {
            client_id: clientId,
            client_name: client.name || '',
            client_phone: client.phone || '',
            last_message: callMessage,
            last_message_time: call.started_at,
            last_message_messenger: 'calls',
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
          const freshClientsData = freshClients as ClientRow[];
          const phonesData = (primaryPhones || []) as PhoneRow[];
          
          const freshMap = new Map(freshClientsData.map((c) => [c.id, c]));
          const phonesMap = new Map(phonesData.map((p) => [p.client_id, p.phone]));
          
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
        return { counts: { whatsapp: 0, telegram: 0, max: 0, chatos: 0, email: 0, calls: 0 }, lastUnreadMessenger: null };
      }

      // Fetch unread INCOMING messages by messenger type.
      // Self-hosted schema: incoming messages are marked by is_outgoing = false.
      // Cloud/fallback schema: use message_type = 'client' if is_outgoing is unavailable.
      let messages: UnreadMessageRow[] = [];
      {
        const trySelfHosted = async () => {
          const { data, error } = await supabase
            .from('chat_messages')
            .select('messenger_type, created_at, is_outgoing')
            .eq('client_id', clientId)
            .eq('is_outgoing', false)
            // Some rows may have NULL is_read; treat them as unread too
            .or('is_read.is.null,is_read.eq.false')
            .neq('messenger_type', 'system')
            .order('created_at', { ascending: false });
          if (error) throw error;
          return (data || []) as unknown as UnreadMessageRow[];
        };

        const tryFallback = async () => {
          const { data, error } = await supabase
            .from('chat_messages')
            .select('messenger_type, created_at')
            .eq('client_id', clientId)
            .eq('message_type', 'client')
            .or('is_read.is.null,is_read.eq.false')
            .neq('messenger_type', 'system')
            .order('created_at', { ascending: false });
          if (error) throw error;
          return (data || []) as unknown as UnreadMessageRow[];
        };

        try {
          messages = await trySelfHosted();
        } catch (e: any) {
          const msg = String(e?.message || '').toLowerCase();
          const isMissingColumn = msg.includes('does not exist') && msg.includes('column') && msg.includes('is_outgoing');
          if (isMissingColumn) {
            messages = await tryFallback();
          } else {
            throw e;
          }
        }
      }

      const counts: UnreadByMessenger = { whatsapp: 0, telegram: 0, max: 0, chatos: 0, email: 0, calls: 0 };
      let lastUnreadMessenger: string | null = null;
      let latestUnreadTime: Date | null = null;

      const messageRows = (messages || []) as UnreadMessageRow[];

      messageRows.forEach((msg) => {
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
        } else if (messengerType === 'chatos') {
          counts.chatos++;
        } else if (messengerType === 'email') {
          counts.email++;
        }
      });

      // Fetch unviewed missed calls count from server
      try {
        counts.calls = await getUnviewedMissedCallsCount(clientId);
        
        // Check if we have unviewed missed calls
        if (counts.calls > 0) {
          // Get the latest missed call to check if it's newer than latest unread message
          const callsResponse = await selfHostedPost<{
            success: boolean;
            calls: Array<{ id: string; started_at: string }>;
          }>('get-call-logs', { 
            action: 'history', 
            clientId,
            limit: 1,
            filters: { status: 'missed' }
          });

          if (callsResponse.success && callsResponse.data?.calls?.length) {
            const latestCallTime = new Date(callsResponse.data.calls[0].started_at);
            if (!latestUnreadTime || latestCallTime > latestUnreadTime) {
              lastUnreadMessenger = 'calls';
            }
          }
        }
      } catch (callsError) {
        console.warn('[useUnreadByMessenger] Failed to fetch missed calls:', callsError);
      }

      return { counts, lastUnreadMessenger };
    },
    enabled: !!clientId,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  return {
    unreadCounts: data?.counts || { whatsapp: 0, telegram: 0, max: 0, chatos: 0, email: 0, calls: 0 },
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
      phoneNumberId,
      metadata,
      messengerType,
    }: {
      clientId: string;
      messageText: string;
      messageType?: 'client' | 'manager' | 'system';
      phoneNumberId?: string;
      metadata?: Record<string, unknown>;
      /** Which messenger tab/thread this message belongs to (whatsapp/telegram/max/chatos/email). */
      messengerType?: string;
    }) => {
      // Get organization_id from cache or fetch it to satisfy RLS on self-hosted
      let organizationId: string | null = null;
      
      const cachedProfile = queryClient.getQueryData<{ organization_id: string }>(['profile']);
      if (cachedProfile?.organization_id) {
        organizationId = cachedProfile.organization_id;
      } else {
        // Fallback: fetch organization_id from profiles
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', userData.user.id)
            .single();
          organizationId = profile?.organization_id || null;
        }
      }

      const isOutgoingMessage = messageType === 'manager' || messageType === 'system';
      const payload: Record<string, unknown> = {
        client_id: clientId,
        message_text: messageText,
        message_type: messageType,
        is_outgoing: isOutgoingMessage, // Mark outgoing messages to exclude from unread count
        is_read: isOutgoingMessage, // Outgoing messages are marked as read
      };

      // Add organization_id explicitly to satisfy RLS policies on self-hosted
      if (organizationId) {
        payload.organization_id = organizationId;
      }

      // Keep self-hosted compatibility: only send optional columns when they exist
      if (phoneNumberId !== undefined) {
        payload.phone_number_id = phoneNumberId;
      }
      if (metadata !== undefined) {
        payload.metadata = metadata;
      }
      if (messengerType !== undefined) {
        payload.messenger_type = messengerType;
      }

      const tryInsert = async (p: Record<string, unknown>) => {
        const { data, error } = await supabase
          .from('chat_messages')
          .insert([p as any])
          .select()
          .single();

        if (error) throw error;
        return data as ChatMessage;
      };

      try {
        return await tryInsert(payload);
      } catch (err: any) {
        // If the self-hosted schema doesn't have optional columns yet, retry without them
        const msg = String(err?.message || '');
        const msgLower = msg.toLowerCase();
        const isMissingColumn = msgLower.includes('does not exist') && msgLower.includes('column');

        const missingMetadata = isMissingColumn && msgLower.includes('metadata');
        const missingPhoneNumberId = isMissingColumn && msgLower.includes('phone_number_id');

        if (missingMetadata || missingPhoneNumberId) {
          const retryPayload: Record<string, unknown> = { ...payload };
          if (missingMetadata) delete retryPayload.metadata;
          if (missingPhoneNumberId) delete retryPayload.phone_number_id;
          return await tryInsert(retryPayload);
        }

        throw err;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', data.client_id] });
      // Инвалидация всех вариантов кэша сообщений чата для синхронизации
      queryClient.invalidateQueries({ 
        queryKey: ['chat-messages-optimized', data.client_id],
        exact: false  // Инвалидирует все варианты с разными limit
      });
      queryClient.invalidateQueries({ 
        queryKey: ['chat-messages-infinite-typed', data.client_id] 
      });
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
    onSuccess: (_, clientId) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', clientId] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
    }
  });
};
