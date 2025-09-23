import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CallComment {
  id: string;
  call_log_id: string | null;
  client_id: string;
  comment_text: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useCallComments = (clientId: string) => {
  return useQuery({
    queryKey: ['call-comments', clientId],
    queryFn: async (): Promise<CallComment[]> => {
      const { data, error } = await supabase
        .from('call_comments' as any)
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []) as any as CallComment[];
    },
    enabled: !!clientId,
  });
};

export const useAddCallComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      clientId, 
      commentText, 
      callLogId 
    }: { 
      clientId: string; 
      commentText: string; 
      callLogId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Создаем комментарий к звонку
      const { data: comment, error: commentError } = await supabase
        .from('call_comments' as any)
        .insert({
          client_id: clientId,
          comment_text: commentText,
          created_by: user.id,
          call_log_id: callLogId || null
        })
        .select()
        .single();

      if (commentError) throw commentError;

      // Дублируем комментарий в чат как системное сообщение
      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          client_id: clientId,
          message_text: commentText,
          message_type: 'comment',
          system_type: 'comment',
          is_outgoing: true,
          messenger_type: 'system'
        });

      if (messageError) throw messageError;

      return comment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['call-comments', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages', variables.clientId] });
      toast({
        title: "Комментарий добавлен",
        description: "Комментарий к звонку успешно добавлен"
      });
    },
    onError: (error) => {
      console.error('Error adding call comment:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить комментарий",
        variant: "destructive"
      });
    }
  });
};