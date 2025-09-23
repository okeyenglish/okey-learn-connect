import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { useEffect } from 'react';

export interface PendingGPTResponse {
  id: string;
  client_id: string;
  messages_context: any[];
  suggested_response: string;
  created_at: string;
  expires_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  approved_by?: string;
  sent_at?: string;
  original_response?: string;
}

export const usePendingGPTResponses = (clientId?: string) => {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['pending-gpt-responses', clientId],
    queryFn: async () => {
      console.log('Fetching pending GPT responses for client:', clientId);
      let queryBuilder = supabase
        .from('pending_gpt_responses')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (clientId) {
        queryBuilder = queryBuilder.eq('client_id', clientId);
      }

      const { data, error } = await queryBuilder;
      
      if (error) {
        console.error('Error fetching pending GPT responses:', error);
        throw error;
      }
      
      console.log('Fetched pending GPT responses:', data);
      return data as PendingGPTResponse[];
    },
    enabled: !!clientId,
    staleTime: 1000, // Consider data stale after 1 second
    gcTime: 5000, // Keep in cache for 5 seconds (replaces cacheTime)
  });

  // Set up realtime subscription
  useEffect(() => {
    console.log('Setting up realtime subscription for pending GPT responses');
    
    let channel = supabase
      .channel('pending-gpt-responses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pending_gpt_responses',
          filter: clientId ? `client_id=eq.${clientId}` : undefined,
        },
        (payload) => {
          console.log('Received realtime update for pending GPT responses:', payload);
          queryClient.invalidateQueries({ queryKey: ['pending-gpt-responses', clientId] });
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [clientId, queryClient]);

  return query;
};

export const useApprovePendingResponse = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ responseId, customMessage }: { responseId: string; customMessage?: string }) => {
      if (!user) throw new Error('User not authenticated');

      // Get the pending response first
      const { data: pendingResponse, error: fetchError } = await supabase
        .from('pending_gpt_responses')
        .select('*')
        .eq('id', responseId)
        .single();

      if (fetchError) throw fetchError;

      const messageToSend = customMessage || pendingResponse.suggested_response;

      // Send the message via WhatsApp
      const { data: sendResult, error: sendError } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          client_id: pendingResponse.client_id,
          message: messageToSend
        }
      });

      if (sendError) throw sendError;

      // Update the pending response status
      const { error: updateError } = await supabase
        .from('pending_gpt_responses')
        .update({
          status: 'approved',
          approved_by: user.id,
          sent_at: new Date().toISOString(),
          original_response: customMessage ? pendingResponse.suggested_response : undefined
        })
        .eq('id', responseId);

      if (updateError) throw updateError;

      return { success: true, messageId: sendResult?.messageId };
    },
    onSuccess: () => {
      toast({
        title: "Сообщение отправлено",
        description: "GPT ответ успешно отправлен клиенту",
      });
      queryClient.invalidateQueries({ queryKey: ['pending-gpt-responses'] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    },
    onError: (error: Error) => {
      console.error('Error approving response:', error);
      toast({
        title: "Ошибка отправки",
        description: "Не удалось отправить сообщение клиенту",
        variant: "destructive",
      });
    },
  });
};

export const useRejectPendingResponse = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (responseId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('pending_gpt_responses')
        .update({
          status: 'rejected',
          approved_by: user.id
        })
        .eq('id', responseId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Ответ отклонен",
        description: "GPT ответ отклонен",
      });
      queryClient.invalidateQueries({ queryKey: ['pending-gpt-responses'] });
    },
    onError: (error: Error) => {
      console.error('Error rejecting response:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отклонить ответ",
        variant: "destructive",
      });
    },
  });
};

export const useTriggerDelayedGPTResponse = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (clientId: string) => {
      const { data, error } = await supabase.functions.invoke('generate-delayed-gpt-response', {
        body: { clientId, maxWaitTimeMs: 30000 }
      });

      if (error) throw error;
      return data;
    },
    onError: (error: Error) => {
      console.error('Error triggering delayed GPT response:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать предложенный ответ",
        variant: "destructive",
      });
    },
  });
};