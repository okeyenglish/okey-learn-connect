import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useToast } from '@/hooks/use-toast';

export const useBulkChargeTuition = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      filters: any;
      amount: number;
      charge_date?: string;
      description?: string;
    }) => {
      const { data, error } = await supabase.rpc('bulk_charge_tuition' as any, {
        p_filters: params.filters,
        p_amount: params.amount,
        p_charge_date: params.charge_date || new Date().toISOString().split('T')[0],
        p_description: params.description || 'Оплата за обучение',
      });

      if (error) throw error;
      return data[0];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tuition-charges'] });
      queryClient.invalidateQueries({ queryKey: ['bulk-operations'] });
      
      toast({
        title: 'Массовое начисление завершено',
        description: `Успешно: ${data.success_count}, Ошибок: ${data.error_count}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка массового начисления',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useBulkGenerateInvoices = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      filters: any;
      due_days?: number;
    }) => {
      const { data, error } = await supabase.rpc('bulk_generate_invoices' as any, {
        p_filters: params.filters,
        p_due_days: params.due_days || 30,
      });

      if (error) throw error;
      return data[0];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['bulk-operations'] });
      
      toast({
        title: 'Генерация счетов завершена',
        description: `Создано счетов: ${data.success_count}, Ошибок: ${data.error_count}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка генерации счетов',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
