import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TeacherRate {
  id: string;
  teacher_id: string;
  lesson_type: 'group' | 'individual';
  rate_per_hour: number;
  effective_from: string;
  effective_until: string | null;
  branch: string | null;
  subject: string | null;
  level: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalaryAccrual {
  id: string;
  teacher_id: string;
  lesson_session_id: string | null;
  individual_lesson_session_id: string | null;
  accrual_date: string;
  academic_hours: number;
  rate_per_hour: number;
  coefficient: number;
  amount: number;
  lesson_type: 'group' | 'individual';
  branch: string | null;
  subject: string | null;
  level: string | null;
  group_id: string | null;
  student_name: string | null;
  is_paid: boolean;
  paid_at: string | null;
  payment_period: string | null;
  notes: string | null;
  created_at: string;
}

export interface SalaryStats {
  total_amount: number;
  total_hours: number;
  total_lessons: number;
  group_lessons: number;
  individual_lessons: number;
  paid_amount: number;
  unpaid_amount: number;
}

// Получить ставки преподавателя
export const useTeacherRates = (teacherId?: string) => {
  return useQuery({
    queryKey: ['teacher-rates', teacherId],
    queryFn: async () => {
      let query = supabase
        .from('teacher_salary_rates' as any)
        .select('*')
        .order('effective_from', { ascending: false });

      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as TeacherRate[];
    },
    enabled: !!teacherId,
  });
};

export const useTeacherAccruals = (teacherId?: string, period?: string) => {
  return useQuery({
    queryKey: ['teacher-accruals', teacherId, period],
    queryFn: async () => {
      let query = supabase
        .from('teacher_salary_accruals' as any)
        .select('*')
        .order('accrual_date', { ascending: false });

      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      }

      if (period) {
        query = query.eq('payment_period', period);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as SalaryAccrual[];
    },
    enabled: !!teacherId,
  });
};

// Получить статистику зарплаты
export const useTeacherSalaryStats = (
  teacherId?: string,
  periodStart?: string,
  periodEnd?: string
) => {
  return useQuery({
    queryKey: ['teacher-salary-stats', teacherId, periodStart, periodEnd],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_teacher_salary_stats' as any, {
        p_teacher_id: teacherId,
        p_period_start: periodStart,
        p_period_end: periodEnd,
      });

      if (error) throw error;
      return data?.[0] as SalaryStats;
    },
    enabled: !!teacherId,
  });
};

// Создать/обновить ставку
export const useUpsertTeacherRate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (rate: Partial<TeacherRate>) => {
      const { data, error } = await supabase
        .from('teacher_salary_rates' as any)
        .upsert(rate)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-rates'] });
      toast({
        title: 'Успешно',
        description: 'Ставка преподавателя обновлена',
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

// Удалить ставку
export const useDeleteTeacherRate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (rateId: string) => {
      const { error } = await supabase
        .from('teacher_salary_rates' as any)
        .delete()
        .eq('id', rateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-rates'] });
      toast({
        title: 'Успешно',
        description: 'Ставка удалена',
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

// Отметить начисления как оплаченные
export const useMarkAccrualsPaid = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (accrualIds: string[]) => {
      const { error } = await supabase
        .from('teacher_salary_accruals' as any)
        .update({
          is_paid: true,
          paid_at: new Date().toISOString(),
        })
        .in('id', accrualIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-accruals'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-salary-stats'] });
      toast({
        title: 'Успешно',
        description: 'Начисления отмечены как оплаченные',
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
