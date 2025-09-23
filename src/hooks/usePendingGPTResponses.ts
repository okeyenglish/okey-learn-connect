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
      console.log('=== FETCHING GPT RESPONSES ===');
      console.log('Fetching pending GPT responses for client:', clientId);
      console.log('Current time:', new Date().toISOString());
      
      let queryBuilder = supabase
        .from('pending_gpt_responses')
        .select('*')
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString()) // Only get non-expired responses
        .order('created_at', { ascending: false });

      if (clientId) {
        queryBuilder = queryBuilder.eq('client_id', clientId);
      }

      const { data, error } = await queryBuilder;
      
      console.log('Raw query result:', { data, error });
      
      if (error) {
        console.error('Error fetching pending GPT responses:', error);
        throw error;
      }
      
      console.log('Fetched pending GPT responses count:', data?.length || 0);
      console.log('=== FETCH COMPLETE ===');
      return data as PendingGPTResponse[];
    },
    enabled: !!clientId,
    staleTime: 10000, // Consider data stale after 10 seconds 
    gcTime: 30000, // Keep in cache for 30 seconds
    refetchInterval: 15000, // Refetch every 15 seconds to clean up expired
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
      console.log('Approving pending response:', responseId, 'custom message:', customMessage);
      if (!user) {
        console.error('No authenticated user');
        throw new Error('User not authenticated');
      }
      console.log('User ID:', user.id);

      // Get the pending response first
      const { data: pendingResponse, error: fetchError } = await supabase
        .from('pending_gpt_responses')
        .select('*')
        .eq('id', responseId)
        .maybeSingle();

      console.log('Fetched pending response:', { pendingResponse, fetchError });
      if (fetchError) {
        console.error('Error fetching pending response:', fetchError);
        throw fetchError;
      }
      
      if (!pendingResponse) {
        console.error('Pending response not found');
        throw new Error('Pending response not found');
      }

      const messageToSend = customMessage || pendingResponse.suggested_response;

      // Send the message via WhatsApp
      const { data: sendResult, error: sendError } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          clientId: pendingResponse.client_id,  // Fix: use clientId instead of client_id
          message: messageToSend
        }
      });

      console.log('WhatsApp send result:', { sendResult, sendError });
      if (sendError) {
        console.error('Error sending WhatsApp message:', sendError);
        throw sendError;
      }

      // Update the pending response status
      const { data: updateData, error: updateError } = await supabase
        .from('pending_gpt_responses')
        .update({
          status: 'approved',
          approved_by: user.id,
          sent_at: new Date().toISOString(),
          original_response: customMessage ? pendingResponse.suggested_response : undefined
        })
        .eq('id', responseId)
        .select();

      console.log('Update result:', { updateData, updateError });
      if (updateError) {
        console.error('Error updating pending response:', updateError);
        throw updateError;
      }

      return { success: true, messageId: sendResult?.messageId, clientId: pendingResponse.client_id, responseId };
    },
    onSuccess: (data) => {
      toast({
        title: "Сообщение отправлено",
        description: "GPT ответ успешно отправлен клиенту",
      });
      // Optimistically remove the card from cache
      if (data?.clientId) {
        queryClient.setQueryData<PendingGPTResponse[]>(['pending-gpt-responses', data.clientId], (old) =>
          (old || []).filter((r) => r.id !== data.responseId)
        );
        queryClient.invalidateQueries({ queryKey: ['pending-gpt-responses', data.clientId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['pending-gpt-responses'] });
      }
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

export const useDismissPendingResponse = () => {
  const queryClient = useQueryClient();  
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (responseId: string) => {
      console.log('=== DISMISS START ===');
      console.log('Dismissing pending response:', responseId);
      console.log('Current user:', user);
      
      if (!user) {
        console.error('No authenticated user');
        throw new Error('User not authenticated');
      }
      console.log('User ID:', user.id);

      // Try to update status first
      console.log('Attempting to update status to dismissed...');
      const { data: updateData, error: updateError } = await supabase
        .from('pending_gpt_responses')
        .update({
          status: 'dismissed',
          approved_by: user.id
        })
        .eq('id', responseId)
        .select();

      console.log('Update result:', { updateData, updateError });
      
      if (updateError) {
        console.log('Update failed, trying delete...');
        // If update fails, try delete
        const { data: deleteData, error: deleteError } = await supabase
          .from('pending_gpt_responses')
          .delete()
          .eq('id', responseId)
          .select();
          
        console.log('Delete result:', { deleteData, deleteError });
        
        if (deleteError) {
          console.error('Both update and delete failed:', deleteError);
          throw deleteError;
        }
        
        return deleteData;
      }
      
      console.log('=== DISMISS SUCCESS ===');
      return updateData;
    },
    onSuccess: (data) => {
      console.log('Dismiss mutation success, invalidating queries...', data);
      queryClient.invalidateQueries({ queryKey: ['pending-gpt-responses'] });
      queryClient.refetchQueries({ queryKey: ['pending-gpt-responses'] });
    },
    onError: (error: Error) => {
      console.error('=== DISMISS ERROR ===', error);
    },
  });
};

export const useRejectPendingResponse = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (responseId: string) => {
      console.log('Rejecting pending response:', responseId);
      if (!user) {
        console.error('No authenticated user');
        throw new Error('User not authenticated');
      }
      console.log('User ID:', user.id);

      const { data, error } = await supabase
        .from('pending_gpt_responses')
        .update({
          status: 'rejected',
          approved_by: user.id
        })
        .eq('id', responseId)
        .select();

      console.log('Update result:', { data, error });
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      return data;
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