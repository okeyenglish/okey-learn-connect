import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BulkOperation {
  id: string;
  operation_type: 'tuition_charge' | 'invoice_generation' | 'payment_reminder' | 'teacher_salary';
  target_filters: any;
  affected_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results?: any;
  error_log?: any[];
  created_at: string;
  updated_at: string;
}

export const useBulkOperations = () => {
  return useQuery({
    queryKey: ['bulk-operations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bulk_operations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BulkOperation[];
    },
  });
};

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
      const { data, error } = await supabase.rpc('bulk_charge_tuition', {
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
      const { data, error } = await supabase.rpc('bulk_generate_invoices', {
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
