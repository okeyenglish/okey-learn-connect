import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from './useAuth';

interface MessageReadStatus {
  user_id: string;
  user_name: string;
  read_at: string;
}

export const useMessageReadStatus = (messageId: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['message-read-status', messageId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_message_read_status', {
        p_message_id: messageId
      });
      
      if (error) {
        console.error('Error fetching message read status:', error);
        throw error;
      }
      
      return data as MessageReadStatus[];
    },
    enabled: !!messageId && !!user,
  });
};

export const useMarkMessageAsRead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (messageId: string) => {
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await supabase.rpc('mark_message_as_read', {
        p_message_id: messageId
      });
      
      if (error) {
        console.error('Error marking message as read:', error);
        throw error;
      }
    },
    onSuccess: (_, messageId) => {
      // Invalidate the read status for this specific message
      queryClient.invalidateQueries({ 
        queryKey: ['message-read-status', messageId] 
      });
      
    }
  });
};

export const useMarkChatMessagesAsRead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (clientId: string) => {
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await supabase.rpc('mark_chat_messages_as_read', {
        p_client_id: clientId
      });
      
      if (error) {
        console.error('Error marking chat messages as read:', error);
        throw error;
      }
    },
    onSuccess: (_, clientId) => {
      // Invalidate all message read statuses
      queryClient.invalidateQueries({ 
        queryKey: ['message-read-status'] 
      });
      
      // Also invalidate chat threads to update unread counts
      queryClient.invalidateQueries({ 
        queryKey: ['chat-threads'] 
      });
      
      // Invalidate unread by messenger for this client
      queryClient.invalidateQueries({ 
        queryKey: ['client-unread-by-messenger', clientId] 
      });
    }
  });
};

// Hook to mark messages as read for a specific messenger type only
export const useMarkChatMessagesAsReadByMessenger = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ clientId, messengerType }: { clientId: string; messengerType: string }) => {
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await supabase.rpc('mark_chat_messages_as_read_by_messenger', {
        p_client_id: clientId,
        p_messenger_type: messengerType
      });
      
      if (error) {
        console.error('Error marking chat messages as read by messenger:', error);
        throw error;
      }
    },
    onSuccess: (_, { clientId }) => {
      // Invalidate all message read statuses
      queryClient.invalidateQueries({ 
        queryKey: ['message-read-status'] 
      });
      
      // Also invalidate chat threads to update unread counts
      queryClient.invalidateQueries({ 
        queryKey: ['chat-threads'] 
      });
      
      // Invalidate unread by messenger for this client
      queryClient.invalidateQueries({ 
        queryKey: ['client-unread-by-messenger', clientId] 
      });
    }
  });
};

// Hook to check if current user has read a specific message
export const useHasUserReadMessage = (messageId: string) => {
  const { user } = useAuth();
  const { data: readStatuses } = useMessageReadStatus(messageId);
  
  return readStatuses?.some(status => status.user_id === user?.id) || false;
};

// Hook to get count of users who read a message
export const useMessageReadCount = (messageId: string) => {
  const { data: readStatuses } = useMessageReadStatus(messageId);
  
  return readStatuses?.length || 0;
};

// Batch operation to mark multiple chats as read in one query
export const useBulkMarkChatsAsRead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (clientIds: string[]) => {
      if (!user) throw new Error('User not authenticated');
      if (clientIds.length === 0) return;
      
      console.log('[BulkMarkAsRead] Marking', clientIds.length, 'chats as read');
      
      // Use a single query with .in() filter for batch update
      const { error } = await supabase
        .from('chat_messages')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .in('client_id', clientIds)
        .eq('is_read', false);
      
      if (error) {
        console.error('[BulkMarkAsRead] Error:', error);
        throw error;
      }
      
      console.log('[BulkMarkAsRead] Successfully marked all chats as read');
    },
    onSuccess: () => {
      // Invalidate all relevant queries once
      queryClient.invalidateQueries({ queryKey: ['message-read-status'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['client-unread-by-messenger'] });
    }
  });
};

// Batch operation to mark multiple chats as unread in one query
export const useBulkMarkChatsAsUnread = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (clientIds: string[]) => {
      if (!user) throw new Error('User not authenticated');
      if (clientIds.length === 0) return;
      
      console.log('[BulkMarkAsUnread] Marking', clientIds.length, 'chats as unread');
      
      // Use a single query with .in() filter for batch update
      const { error } = await supabase
        .from('chat_messages')
        .update({ 
          is_read: false,
          read_at: null
        })
        .in('client_id', clientIds);
      
      if (error) {
        console.error('[BulkMarkAsUnread] Error:', error);
        throw error;
      }
      
      console.log('[BulkMarkAsUnread] Successfully marked all chats as unread');
    },
    onSuccess: () => {
      // Invalidate all relevant queries once
      queryClient.invalidateQueries({ queryKey: ['message-read-status'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['client-unread-by-messenger'] });
    }
  });
};
