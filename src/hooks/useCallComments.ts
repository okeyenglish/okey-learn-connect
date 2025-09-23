import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
        .from('call_comments')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []) as CallComment[];
    },
    enabled: !!clientId,
  });
};

export const useCreateCallComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      clientId, 
      commentText, 
      callLogId 
    }: { 
      clientId: string; 
      commentText: string; 
      callLogId?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('call_comments')
        .insert({
          client_id: clientId,
          comment_text: commentText,
          call_log_id: callLogId,
          created_by: (await supabase.auth.getUser()).data.user?.id || '',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch call comments for this client
      queryClient.invalidateQueries({ 
        queryKey: ['call-comments', variables.clientId] 
      });
    },
  });
};

export const useUpdateCallComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      commentId, 
      commentText,
      clientId 
    }: { 
      commentId: string; 
      commentText: string;
      clientId: string;
    }) => {
      const { data, error } = await supabase
        .from('call_comments')
        .update({ comment_text: commentText })
        .eq('id', commentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['call-comments', variables.clientId] 
      });
    },
  });
};

export const useDeleteCallComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      commentId,
      clientId 
    }: { 
      commentId: string;
      clientId: string;
    }) => {
      const { error } = await supabase
        .from('call_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['call-comments', variables.clientId] 
      });
    },
  });
};