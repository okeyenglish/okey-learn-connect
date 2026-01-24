import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useToast } from '@/hooks/use-toast';
import { CustomDatabase } from '@/integrations/supabase/database.types';

type DbInvoice = Database['public']['Tables']['invoices']['Row'];
type DbInvoiceInsert = Database['public']['Tables']['invoices']['Insert'];
type DbInvoiceUpdate = Database['public']['Tables']['invoices']['Update'];

export interface Invoice extends Omit<DbInvoice, 'students'> {
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
        .order('created_at', { ascending: false });

      if (filters?.student_id) {
        query = query.eq('student_id', filters.student_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status as any);
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
    mutationFn: async (invoiceData: DbInvoiceInsert) => {
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
    mutationFn: async ({ id, updates }: { id: string; updates: DbInvoiceUpdate }) => {
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
      // FSM validation errors
      const message = error.message;
      if (message?.includes('transition') || message?.includes('status')) {
        toast({
          title: 'Недопустимый переход статуса',
          description: message,
          variant: 'destructive',
        });
      } else if (message?.includes('amount') && message?.includes('issued')) {
        toast({
          title: 'Нельзя изменить сумму',
          description: 'Сумма счета не может быть изменена после выставления',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Ошибка обновления счета',
          description: message,
          variant: 'destructive',
        });
      }
    },
  });
};
