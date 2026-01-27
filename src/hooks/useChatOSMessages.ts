import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface ChatOSMessage {
  id: string;
  client_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'client' | 'company' | 'teacher';
  message_text: string;
  message_type: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  is_read: boolean;
  created_at: string;
}

/**
 * Hook for fetching ChatOS internal chat messages for a client
 * Uses chat_messages table with messenger='chatos'
 */
export const useChatOSMessages = (clientId: string, enabled = true) => {
  return useQuery({
    queryKey: ['chatos-messages', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('client_id', clientId)
        .eq('messenger', 'chatos')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching ChatOS messages:', error);
        return [];
      }

      return (data || []).map(msg => ({
        id: msg.id,
        client_id: msg.client_id || clientId,
        sender_id: msg.sender_id || '',
        sender_name: msg.sender_name || 'Система',
        sender_role: (msg.direction === 'outgoing' ? 'company' : 'client') as ChatOSMessage['sender_role'],
        message_text: msg.content || '',
        message_type: msg.message_type || 'text',
        file_url: msg.media_url,
        file_name: msg.file_name,
        file_type: msg.media_type,
        is_read: msg.is_read || false,
        created_at: msg.created_at,
      })) as ChatOSMessage[];
    },
    enabled: enabled && !!clientId,
    staleTime: 30_000, // 30 sec
  });
};

/**
 * Hook for sending ChatOS messages
 */
export const useSendChatOSMessage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (messageData: {
      client_id: string;
      message_text: string;
      sender_role: 'company' | 'teacher';
      file_url?: string;
      file_name?: string;
      file_type?: string;
    }) => {
      // Get user profile for sender name
      let senderName = 'Компания';
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          senderName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Компания';
        }
      }

      // Get organization_id
      const { data: orgData } = await supabase
        .rpc('get_user_organization_id');
      
      const organizationId = orgData as string;

      const { data, error } = await supabase
        .from('chat_messages')
        .insert([{
          client_id: messageData.client_id,
          content: messageData.message_text,
          messenger: 'chatos',
          message_type: messageData.file_url ? 'file' : 'text',
          direction: 'outgoing',
          sender_id: user?.id,
          sender_name: senderName,
          media_url: messageData.file_url,
          file_name: messageData.file_name,
          media_type: messageData.file_type,
          is_read: true,
          status: 'sent',
          organization_id: organizationId,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chatos-messages', variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ['client-unread-by-messenger', variables.client_id] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отправить сообщение в ChatOS",
        variant: "destructive"
      });
    }
  });
};

/**
 * Hook for counting unread ChatOS messages for a client
 */
export const useChatOSUnreadCount = (clientId: string) => {
  return useQuery({
    queryKey: ['chatos-unread', clientId],
    queryFn: async () => {
      if (!clientId) return 0;

      const { count, error } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('messenger', 'chatos')
        .eq('direction', 'incoming')
        .eq('is_read', false);

      if (error) {
        console.error('Error fetching ChatOS unread count:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!clientId,
    staleTime: 10_000,
  });
};
