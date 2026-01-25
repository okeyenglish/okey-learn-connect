import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/typedClient";
import { useToast } from "@/hooks/use-toast";

export interface FamilyLedger {
  id: string;
  family_group_id?: string;
  client_id?: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyLedgerTransaction {
  id: string;
  family_ledger_id: string;
  transaction_type: 'credit' | 'debit' | 'transfer_to_student' | 'refund';
  amount: number;
  description: string;
  payment_id?: string;
  student_id?: string;
  created_by?: string;
  created_at: string;
}

// Получить семейную кассу (по семье или клиенту)
export const useFamilyLedger = (familyGroupId?: string, clientId?: string) => {
  return useQuery({
    queryKey: ['family-ledger', familyGroupId, clientId],
    queryFn: async () => {
      if (!familyGroupId && !clientId) return null;
      
      let query = supabase
        .from('family_ledger')
        .select('*');

      if (familyGroupId) {
        query = query.eq('family_group_id', familyGroupId);
      } else if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      return data as FamilyLedger | null;
    },
    enabled: !!(familyGroupId || clientId),
  });
};

// Получить историю транзакций семейной кассы
export const useFamilyLedgerTransactions = (ledgerId?: string) => {
  return useQuery({
    queryKey: ['family-ledger-transactions', ledgerId],
    queryFn: async () => {
      if (!ledgerId) return [];
      
      const { data, error } = await supabase
        .from('family_ledger_transactions')
        .select('*')
        .eq('family_ledger_id', ledgerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as FamilyLedgerTransaction[];
    },
    enabled: !!ledgerId,
  });
};

// Пополнить семейную кассу
export const useAddFamilyLedgerTransaction = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      familyGroupId,
      clientId,
      amount,
      transactionType,
      description,
      paymentId,
    }: {
      familyGroupId?: string;
      clientId?: string;
      amount: number;
      transactionType: 'credit' | 'debit' | 'transfer_to_student' | 'refund';
      description: string;
      paymentId?: string;
    }) => {
      const { error } = await supabase.rpc('add_family_ledger_transaction', {
        _family_group_id: familyGroupId || null,
        _client_id: clientId || null,
        _amount: amount,
        _transaction_type: transactionType,
        _description: description,
        _payment_id: paymentId || null,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['family-ledger', variables.familyGroupId, variables.clientId] 
      });
      queryClient.invalidateQueries({ queryKey: ['family-ledger-transactions'] });
      toast({
        title: "Успешно",
        description: "Операция выполнена",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось выполнить операцию",
        variant: "destructive",
      });
    },
  });
};

// Перевести деньги с семейной кассы на ЛС студента
export const useTransferToStudentBalance = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      familyLedgerId,
      studentId,
      amount,
      description,
    }: {
      familyLedgerId: string;
      studentId: string;
      amount: number;
      description: string;
    }) => {
      const { error } = await supabase.rpc('transfer_to_student_balance', {
        _family_ledger_id: familyLedgerId,
        _student_id: studentId,
        _amount: amount,
        _description: description,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['family-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['family-ledger-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['student-balance', variables.studentId] });
      queryClient.invalidateQueries({ queryKey: ['balance-transactions', variables.studentId] });
      toast({
        title: "Успешно",
        description: "Средства переведены на счёт студента",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось перевести средства",
        variant: "destructive",
      });
    },
  });
};
