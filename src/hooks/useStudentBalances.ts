import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useToast } from '@/hooks/use-toast';

export interface StudentBalance {
  student_id: string;
  first_name: string;
  last_name: string;
  status: string;
  branch: string;
  balance_rub: number;
  balance_hours: number;
  total_payments: number;
  total_lessons_charged: number;
  last_payment_date: string | null;
  estimated_end_date: string;
}

export interface LowBalanceStudent {
  student_id: string;
  student_name: string;
  balance_hours: number;
  estimated_days_left: number;
  last_payment_date: string | null;
  weekly_consumption: number;
}

export interface BalanceTransaction {
  id: string;
  student_id: string;
  amount: number;
  academic_hours: number | null;
  transaction_type: string;
  description: string;
  payment_id: string | null;
  lesson_session_id: string | null;
  related_group_id: string | null;
  related_individual_lesson_id: string | null;
  price_per_hour: number | null;
  source_student_id: string | null;
  target_student_id: string | null;
  created_at: string;
}

// Получить все балансы студентов
export const useStudentBalances = () => {
  return useQuery({
    queryKey: ['student-balances'],
    queryFn: async () => {
      const { data: orgId, error: orgError } = await supabase.rpc('get_user_organization_id');
      
      if (orgError) throw orgError;
      
      // Временно: используем студентов напрямую
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('status', 'active');

      if (studentsError) throw studentsError;
      return students;
    },
  });
};

// Получить студентов с низким балансом
export const useLowBalanceStudents = (daysThreshold = 7, hoursThreshold = 4) => {
  return useQuery({
    queryKey: ['low-balance-students', daysThreshold, hoursThreshold],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.rpc('get_students_with_low_balance', {
          days_threshold: daysThreshold,
          hours_threshold: hoursThreshold,
        });

        if (error) throw error;
        return (data || []) as LowBalanceStudent[];
      } catch (error) {
        console.error('Error fetching low balance students:', error);
        return [];
      }
    },
  });
};

// Получить историю транзакций студента
export const useBalanceTransactions = (studentId: string) => {
  return useQuery({
    queryKey: ['balance-transactions', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('balance_transactions')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as BalanceTransaction[];
    },
    enabled: !!studentId,
  });
};

// Добавить транзакцию (пополнение/списание)
export const useAddBalanceTransaction = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (transaction: {
      student_id: string;
      amount: number;
      academic_hours?: number;
      transaction_type: string;
      description: string;
      price_per_hour?: number;
      payment_id?: string;
      lesson_session_id?: string;
      related_group_id?: string;
      related_individual_lesson_id?: string;
      source_student_id?: string;
      target_student_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('balance_transactions')
        .insert([transaction])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-balances'] });
      queryClient.invalidateQueries({ queryKey: ['low-balance-students'] });
      queryClient.invalidateQueries({ queryKey: ['balance-transactions'] });
      toast({
        title: 'Успешно',
        description: 'Транзакция добавлена',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// Перевести средства между студентами
export const useTransferBetweenStudents = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      fromStudentId,
      toStudentId,
      amount,
      description,
      viaFamilyLedger = false,
    }: {
      fromStudentId: string;
      toStudentId: string;
      amount: number;
      description: string;
      viaFamilyLedger?: boolean;
    }) => {
      const { data, error } = await supabase.rpc('transfer_between_students', {
        _from_student_id: fromStudentId,
        _to_student_id: toStudentId,
        _amount: amount,
        _description: description,
        _via_family_ledger: viaFamilyLedger,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-balances'] });
      queryClient.invalidateQueries({ queryKey: ['balance-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['family-ledger'] });
      toast({
        title: 'Успешно',
        description: 'Средства переведены',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка перевода',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// Создать уведомления о низком балансе
export const useCreatePaymentNotifications = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      try {
        const { error } = await supabase.rpc('auto_create_payment_notifications');
        if (error) throw error;
      } catch (error) {
        console.error('Error creating notifications:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-notifications'] });
      toast({
        title: 'Успешно',
        description: 'Уведомления созданы',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// Получить уведомления о платежах
export const usePaymentNotifications = () => {
  return useQuery({
    queryKey: ['payment-notifications'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('payment_notifications')
          .select('*')
          .order('notification_date', { ascending: false })
          .limit(100);

        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }
    },
  });
};

// Отметить уведомление как отправленное
export const useMarkNotificationSent = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('payment_notifications')
        .update({
          is_sent: true,
          sent_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-notifications'] });
      toast({
        title: 'Успешно',
        description: 'Уведомление отмечено как отправленное',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// Интерфейс для результата проверки баланса
export interface BalanceCheckResult {
  has_sufficient_balance: boolean;
  current_balance_hours: number;
  current_balance_rub: number;
  message: string;
}

// Проверить баланс студента
export const useCheckStudentBalance = () => {
  return useMutation({
    mutationFn: async ({ studentId, requiredHours = 4 }: { studentId: string; requiredHours?: number }) => {
      const { data, error } = await supabase.rpc('check_student_balance', {
        p_student_id: studentId,
        p_required_hours: requiredHours,
      });

      if (error) throw error;
      return (data as BalanceCheckResult[])?.[0] as BalanceCheckResult;
    },
  });
};
