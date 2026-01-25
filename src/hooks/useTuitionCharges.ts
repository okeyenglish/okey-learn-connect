import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/typedClient";
import { useToast } from "@/hooks/use-toast";

export interface TuitionCharge {
  id: string;
  student_id: string;
  learning_unit_type: 'group' | 'individual';
  learning_unit_id: string;
  amount: number;
  currency: string;
  academic_hours: number;
  charge_date: string;
  description?: string;
  status: 'active' | 'cancelled' | 'refunded';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentTuitionLink {
  id: string;
  payment_id: string;
  tuition_charge_id: string;
  amount: number;
  created_at: string;
}

// Получить списания студента
export const useTuitionCharges = (studentId?: string) => {
  return useQuery({
    queryKey: ['tuition-charges', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      
      const { data, error } = await (supabase.from('tuition_charges' as any) as any)
        .select('*')
        .eq('student_id', studentId)
        .order('charge_date', { ascending: false });

      if (error) throw error;
      return (data || []) as TuitionCharge[];
    },
    enabled: !!studentId,
  });
};

// Получить списания по учебной единице
export const useTuitionChargesByLearningUnit = (
  learningUnitType?: 'group' | 'individual',
  learningUnitId?: string
) => {
  return useQuery({
    queryKey: ['tuition-charges-unit', learningUnitType, learningUnitId],
    queryFn: async () => {
      if (!learningUnitType || !learningUnitId) return [];
      
      const { data, error } = await (supabase.from('tuition_charges' as any) as any)
        .select('*')
        .eq('learning_unit_type', learningUnitType)
        .eq('learning_unit_id', learningUnitId)
        .order('charge_date', { ascending: false });

      if (error) throw error;
      return (data || []) as TuitionCharge[];
    },
    enabled: !!(learningUnitType && learningUnitId),
  });
};

// Создать списание на обучение
export const useCreateTuitionCharge = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      studentId,
      learningUnitType,
      learningUnitId,
      amount,
      currency = 'RUB',
      academicHours,
      chargeDate,
      description,
      paymentId,
    }: {
      studentId: string;
      learningUnitType: 'group' | 'individual';
      learningUnitId: string;
      amount: number;
      currency?: string;
      academicHours: number;
      chargeDate?: string;
      description?: string;
      paymentId?: string;
    }) => {
      // Создаём списание
      const { data: charge, error: chargeError } = await (supabase
        .from('tuition_charges' as any) as any)
        .insert({
          student_id: studentId,
          learning_unit_type: learningUnitType,
          learning_unit_id: learningUnitId,
          amount,
          currency,
          academic_hours: academicHours,
          charge_date: chargeDate || new Date().toISOString().split('T')[0],
          description,
          status: 'active',
        })
        .select()
        .single();

      if (chargeError) throw chargeError;

      // Если указан платёж - создаём связь
      if (paymentId && charge) {
        const { error: linkError } = await (supabase
          .from('payment_tuition_link' as any) as any)
          .insert({
            payment_id: paymentId,
            tuition_charge_id: (charge as any).id,
            amount,
          });

        if (linkError) throw linkError;
      }

      // Списываем с баланса студента
      await (supabase.rpc as any)('add_balance_transaction', {
        _student_id: studentId,
        _amount: -amount,
        _transaction_type: 'debit',
        _description: description || 'Оплата обучения',
        _payment_id: paymentId || null,
        _lesson_session_id: null,
      });

      return charge;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tuition-charges', variables.studentId] });
      queryClient.invalidateQueries({ 
        queryKey: ['tuition-charges-unit', variables.learningUnitType, variables.learningUnitId] 
      });
      queryClient.invalidateQueries({ queryKey: ['student-balance', variables.studentId] });
      queryClient.invalidateQueries({ queryKey: ['balance-transactions', variables.studentId] });
      toast({
        title: "Успешно",
        description: "Списание создано",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать списание",
        variant: "destructive",
      });
    },
  });
};

// Отменить списание
export const useCancelTuitionCharge = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ chargeId }: { chargeId: string }) => {
      // Получаем данные списания
      const { data: charge, error: fetchError } = await (supabase
        .from('tuition_charges' as any) as any)
        .select('*')
        .eq('id', chargeId)
        .single();

      if (fetchError) throw fetchError;

      // Обновляем статус
      const { error: updateError } = await (supabase
        .from('tuition_charges' as any) as any)
        .update({ status: 'cancelled' })
        .eq('id', chargeId);

      if (updateError) throw updateError;

      // Возвращаем деньги на баланс студента
      await (supabase.rpc as any)('add_balance_transaction', {
        _student_id: (charge as any).student_id,
        _amount: (charge as any).amount,
        _transaction_type: 'refund',
        _description: 'Отмена списания: ' + ((charge as any).description || ''),
        _payment_id: null,
        _lesson_session_id: null,
      });

      return charge;
    },
    onSuccess: (charge: any) => {
      queryClient.invalidateQueries({ queryKey: ['tuition-charges'] });
      queryClient.invalidateQueries({ queryKey: ['student-balance', charge?.student_id] });
      queryClient.invalidateQueries({ queryKey: ['balance-transactions', charge?.student_id] });
      toast({
        title: "Успешно",
        description: "Списание отменено, средства возвращены",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отменить списание",
        variant: "destructive",
      });
    },
  });
};
