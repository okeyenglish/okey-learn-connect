import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to manage pending payment status for clients
 */
export const usePendingPayment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  /**
   * Mark payment as processed (clear pending payment flag)
   */
  const markPaymentProcessed = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from('clients')
        .update({ has_pending_payment: false } as any)
        .eq('id', clientId);

      if (error) {
        console.error('[usePendingPayment] Error marking payment as processed:', error);
        throw error;
      }

      return clientId;
    },
    onSuccess: (clientId) => {
      // Invalidate all relevant caches
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads-unread-priority'] });
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });

      toast({
        title: "Готово",
        description: "Оплата отмечена как проведённая",
      });
    },
    onError: (error) => {
      console.error('[usePendingPayment] Mutation error:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отметить оплату",
        variant: "destructive",
      });
    },
  });

  /**
   * Set pending payment flag (called when payment success message is received)
   */
  const setPendingPayment = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from('clients')
        .update({ has_pending_payment: true } as any)
        .eq('id', clientId);

      if (error) {
        console.error('[usePendingPayment] Error setting pending payment:', error);
        throw error;
      }

      return clientId;
    },
    onSuccess: (clientId) => {
      // Invalidate caches to show the payment badge
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads-unread-priority'] });
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
    },
    onError: (error) => {
      console.error('[usePendingPayment] Set pending payment error:', error);
    },
  });

  return {
    markPaymentProcessed,
    setPendingPayment,
    isProcessing: markPaymentProcessed.isPending,
    isSettingPending: setPendingPayment.isPending,
  };
};

export default usePendingPayment;
