import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  student_id: string;
  subscription_id?: string;
  amount: number;
  currency_id: string;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  invoice_id?: string;
  student_id: string;
  amount: number;
  currency_id: string;
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'online' | 'bonus';
  payment_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BonusAccount {
  id: string;
  student_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

// Hooks
export const useCurrencies = () => {
  return useQuery({
    queryKey: ['currencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('currencies')
        .select('*')
        .order('code');
      
      if (error) throw error;
      return data as Currency[];
    }
  });
};

export const useInvoices = () => {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          student:profiles!student_id(first_name, last_name),
          currency:currencies(code, symbol)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
};

export const usePayments = () => {
  return useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          student:profiles!student_id(first_name, last_name),
          currency:currencies(code, symbol)
        `)
        .order('payment_date', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
};

export const useBonusAccounts = () => {
  return useQuery({
    queryKey: ['bonus_accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bonus_accounts')
        .select(`
          *,
          student:profiles!student_id(first_name, last_name, email)
        `)
        .order('balance', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (invoiceData: Partial<Invoice>) => {
      const { data, error } = await supabase
        .from('invoices')
        .insert([invoiceData as any])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Счёт успешно создан');
    },
    onError: (error) => {
      toast.error('Ошибка при создании счёта: ' + error.message);
    }
  });
};

export const useCreatePayment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (paymentData: Partial<Payment>) => {
      const { data, error } = await supabase
        .from('payments')
        .insert([paymentData as any])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['bonus_accounts'] });
      toast.success('Платёж успешно создан');
    },
    onError: (error) => {
      toast.error('Ошибка при создании платежа: ' + error.message);
    }
  });
};
