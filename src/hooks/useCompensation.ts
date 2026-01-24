import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useToast } from '@/hooks/use-toast';

interface CompensationResult {
  success: boolean;
  error?: string;
  sessions_reverted?: number;
  payment_id?: string;
}

/**
 * Hook for manual payment compensation (rollback)
 * Reverts payment and all related session changes
 */
export const useCompensatePayment = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ paymentId, reason }: { paymentId: string; reason?: string }) => {
      const { data, error } = await supabase.rpc('manual_compensate_payment', {
        p_payment_id: paymentId,
        p_reason: reason || 'Manual rollback'
      });

      if (error) throw error;
      
      const result = data as unknown as CompensationResult;
      
      if (!result?.success) {
        throw new Error(result?.error || 'Compensation failed');
      }

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['individual-lesson-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['lesson-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['student-details'] });
      
      toast({
        title: 'Платеж отменен',
        description: `Откачено ${data.sessions_reverted || 0} занятий`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка компенсации',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};



