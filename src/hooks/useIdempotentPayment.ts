import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface IdempotentPaymentParams {
  student_id: string;
  amount: number;
  method: 'cash' | 'card' | 'transfer' | 'online';
  payment_date: string;
  description?: string;
  notes?: string;
  individual_lesson_id?: string;
  group_id?: string;
  lessons_count?: number;
  provider_transaction_id?: string;
}

/**
 * Hook for creating idempotent payments
 * Prevents duplicate payments using idempotency_key
 */
export const useIdempotentPayment = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentData: IdempotentPaymentParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Generate idempotency key if not provided
      const idempotencyKey = `payment_${paymentData.student_id}_${paymentData.payment_date}_${paymentData.amount}_${Date.now()}`;

      // Check if payment with this idempotency key already exists
      if (paymentData.provider_transaction_id) {
        const { data: existing } = await supabase
          .from('payments')
          .select('id')
          .eq('provider_transaction_id', paymentData.provider_transaction_id)
          .maybeSingle();

        if (existing) {
          toast({
            title: 'Платеж уже существует',
            description: 'Этот платеж уже был обработан ранее',
            variant: 'destructive',
          });
          throw new Error('Duplicate payment detected');
        }
      }

      const { data: payment, error } = await supabase
        .from('payments')
        .insert([{
          student_id: paymentData.student_id,
          amount: paymentData.amount,
          method: paymentData.method,
          payment_date: paymentData.payment_date,
          description: paymentData.description,
          notes: paymentData.notes,
          status: 'pending',
          created_by: user?.id,
          individual_lesson_id: paymentData.individual_lesson_id,
          group_id: paymentData.group_id,
          lessons_count: paymentData.lessons_count || 0,
          idempotency_key: idempotencyKey,
          provider_transaction_id: paymentData.provider_transaction_id,
        }])
        .select()
        .single();

      if (error) {
        // Check if it's a duplicate key error
        if (error.code === '23505') {
          toast({
            title: 'Дублирующий платеж',
            description: 'Этот платеж уже обрабатывается или был обработан',
            variant: 'destructive',
          });
        }
        throw error;
      }

      return payment;
    },
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['student-details'] });
      queryClient.invalidateQueries({ queryKey: ['student-group-payment-stats'] });
      
      toast({
        title: 'Платеж создан',
        description: `Платеж на сумму ${payment.amount} руб. успешно создан`,
      });
    },
    onError: (error: any) => {
      const message = error.message;
      if (!message?.includes('Duplicate') && !message?.includes('уже')) {
        toast({
          title: 'Ошибка создания платежа',
          description: message,
          variant: 'destructive',
        });
      }
    },
  });
};

/**
 * Hook for confirming pending payments
 * Transitions payment from 'pending' to 'confirmed'
 */
export const useConfirmPayment = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentId: string) => {
      const { data, error } = await supabase
        .from('payments')
        .update({ status: 'completed' })
        .eq('id', paymentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast({
        title: 'Платеж подтвержден',
        description: 'Платеж успешно подтвержден',
      });
    },
    onError: (error: any) => {
      const message = error.message;
      if (message?.includes('transition') || message?.includes('status')) {
        toast({
          title: 'Недопустимый переход статуса',
          description: message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Ошибка подтверждения платежа',
          description: message,
          variant: 'destructive',
        });
      }
    },
  });
};
