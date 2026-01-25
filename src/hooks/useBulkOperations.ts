import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/database.types';

export const useBulkChargeTuition = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      filters: Record<string, unknown>;
      amount: number;
      charge_date?: string;
      description?: string;
    }) => {
      const { data, error } = await supabase.rpc('bulk_charge_tuition', {
        p_filters: params.filters as Json,
        p_amount: params.amount,
        p_description: params.description || 'Оплата за обучение',
      });

      if (error) throw error;
      
      const result = data as { success_count: number; error_count: number } | null;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tuition-charges'] });
      queryClient.invalidateQueries({ queryKey: ['bulk-operations'] });
      
      toast({
        title: 'Массовое начисление завершено',
        description: `Успешно: ${data?.success_count ?? 0}, Ошибок: ${data?.error_count ?? 0}`,
      });
    },
    onError: (error: Error) => {
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
      filters: Record<string, unknown>;
      due_days?: number;
    }) => {
      const { data, error } = await supabase.rpc('bulk_generate_invoices', {
        p_filters: params.filters as Json,
        p_due_days: params.due_days || 30,
      });

      if (error) throw error;
      
      const result = data as { success_count: number; error_count: number } | null;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['bulk-operations'] });
      
      toast({
        title: 'Генерация счетов завершена',
        description: `Создано счетов: ${data?.success_count ?? 0}, Ошибок: ${data?.error_count ?? 0}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка генерации счетов',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
