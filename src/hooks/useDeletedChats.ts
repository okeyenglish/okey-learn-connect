import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { toast } from 'sonner';

export interface DeletedChat {
  id: string;
  name: string;
  phone: string | null;
  branch: string | null;
  last_message_at: string | null;
  updated_at: string;
}

export const useDeletedChats = () => {
  return useQuery({
    queryKey: ['deleted-chats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, phone, branch, last_message_at, updated_at')
        .eq('is_active', false)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[useDeletedChats] Error:', error);
        throw error;
      }

      return (data || []) as DeletedChat[];
    },
    staleTime: 30000,
  });
};

export const useRestoreChat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (chatId: string) => {
      const { error } = await supabase
        .from('clients')
        .update({ is_active: true })
        .eq('id', chatId);

      if (error) throw error;
      return chatId;
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['deleted-chats'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-client-ids'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Чат восстановлен');
    },
    onError: (error) => {
      console.error('[useRestoreChat] Error:', error);
      toast.error('Не удалось восстановить чат');
    },
  });
};

export const usePermanentDeleteChat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (chatId: string) => {
      // First delete all messages
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('client_id', chatId);

      if (messagesError) {
        console.error('[usePermanentDeleteChat] Error deleting messages:', messagesError);
        // Continue even if messages deletion fails
      }

      // Then delete the client
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', chatId);

      if (error) throw error;
      return chatId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted-chats'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-client-ids'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Чат удалён навсегда');
    },
    onError: (error) => {
      console.error('[usePermanentDeleteChat] Error:', error);
      toast.error('Не удалось удалить чат');
    },
  });
};
