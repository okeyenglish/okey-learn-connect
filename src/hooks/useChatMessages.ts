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
}

export interface ChatThread {
  client_id: string;
  client_name: string;
  client_phone: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  messages: ChatMessage[];
}

export const useChatMessages = (clientId: string) => {
  const { data: messages, isLoading, error } = useQuery({
    queryKey: ['chat-messages', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!clientId,
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          client_id,
          message_text,
          created_at,
          is_read,
          clients (
            id,
            name,
            phone
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Group messages by client
      const threadsMap = new Map<string, ChatThread>();
      
      data?.forEach((message: any) => {
        const clientId = message.client_id;
        const client = message.clients;
        
        if (!client) return;
        
        if (!threadsMap.has(clientId)) {
          threadsMap.set(clientId, {
            client_id: clientId,
            client_name: client.name,
            client_phone: client.phone,
            last_message: message.message_text,
            last_message_time: message.created_at,
            unread_count: 0,
            messages: [],
          });
        }
        
        const thread = threadsMap.get(clientId)!;
        if (new Date(message.created_at) > new Date(thread.last_message_time)) {
          thread.last_message = message.message_text;
          thread.last_message_time = message.created_at;
        }
        
        if (!message.is_read) {
          thread.unread_count++;
        }
      });

      return Array.from(threadsMap.values())
        .sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime());
    },
  });

  return {
    threads: threads || [],
    isLoading,
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
          queryClient.invalidateQueries({ queryKey: ['chat-messages', clientId] });
          queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
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
          queryClient.invalidateQueries({ queryKey: ['chat-messages', clientId] });
          queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
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