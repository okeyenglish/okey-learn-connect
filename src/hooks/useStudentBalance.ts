import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/typedClient";
import { useToast } from "@/hooks/use-toast";

export interface StudentBalance {
  id: string;
  student_id: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface BalanceTransaction {
  id: string;
  student_balance_id: string;
  amount: number;
  transaction_type: 'credit' | 'debit' | 'transfer_in' | 'refund';
  description: string;
  payment_id?: string;
  lesson_session_id?: string;
  created_by?: string;
  created_at: string;
}

// Получить баланс студента
export const useStudentBalance = (studentId: string | undefined) => {
  return useQuery({
    queryKey: ['student-balance', studentId],
    queryFn: async () => {
      if (!studentId) return null;
      
      const { data, error } = await (supabase
        .from('student_balances' as any) as any)
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();

      if (error) throw error;
      return data as StudentBalance | null;
    },
    enabled: !!studentId,
  });
};

// Получить историю транзакций
export const useBalanceTransactions = (studentId: string | undefined) => {
  return useQuery({
    queryKey: ['balance-transactions', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      
      const { data: balanceData } = await (supabase
        .from('student_balances' as any) as any)
        .select('id')
        .eq('student_id', studentId)
        .maybeSingle();

      if (!balanceData) return [];

      const { data, error } = await (supabase
        .from('balance_transactions' as any) as any)
        .select('*')
        .eq('student_balance_id', (balanceData as any).id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as any) as BalanceTransaction[];
    },
    enabled: !!studentId,
  });
};

// Добавить транзакцию
export const useAddBalanceTransaction = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      studentId,
      amount,
      transactionType,
      description,
      paymentId,
      lessonSessionId,
    }: {
      studentId: string;
      amount: number;
      transactionType: 'credit' | 'debit' | 'transfer_in' | 'refund';
      description: string;
      paymentId?: string;
      lessonSessionId?: string;
    }) => {
      const { data, error } = await (supabase.rpc as any)('add_balance_transaction', {
        _student_id: studentId,
        _amount: amount,
        _transaction_type: transactionType,
        _description: description,
        _payment_id: paymentId || null,
        _lesson_session_id: lessonSessionId || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-balance', variables.studentId] });
      queryClient.invalidateQueries({ queryKey: ['balance-transactions', variables.studentId] });
      toast({
        title: "Успешно",
        description: "Транзакция успешно добавлена",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось добавить транзакцию",
        variant: "destructive",
      });
    },
  });
};

// Получить баланс через RPC функцию
export const useGetStudentBalanceAmount = (studentId: string | undefined) => {
  return useQuery({
    queryKey: ['student-balance-amount', studentId],
    queryFn: async () => {
      if (!studentId) return 0;
      
      const { data, error } = await (supabase.rpc as any)('get_student_balance', {
        _student_id: studentId,
      });

      if (error) throw error;
      return data as number;
    },
    enabled: !!studentId,
  });
};
