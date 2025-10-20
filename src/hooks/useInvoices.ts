import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Invoice {
  id: string;
  invoice_number: string;
  student_id?: string;
  client_id?: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  items: any[];
  notes?: string;
  created_at: string;
  updated_at: string;
  students?: {
    first_name: string;
    last_name: string;
  };
}

export const useInvoices = (filters?: { student_id?: string; status?: string }) => {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select('*, students(first_name, last_name)')
        .order('invoice_date', { ascending: false });

      if (filters?.student_id) {
        query = query.eq('student_id', filters.student_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Invoice[];
    },
  });
};

export const useCreateInvoice = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceData: Partial<Invoice>) => {
      const { data, error } = await supabase
        .from('invoices')
        .insert(invoiceData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: 'Счет создан',
        description: 'Счет успешно создан',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка создания счета',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateInvoice = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Invoice> }) => {
      const { data, error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: 'Счет обновлен',
        description: 'Счет успешно обновлен',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка обновления счета',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
