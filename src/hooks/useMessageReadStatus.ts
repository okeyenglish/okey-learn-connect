import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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