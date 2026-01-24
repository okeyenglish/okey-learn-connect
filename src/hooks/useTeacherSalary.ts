import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useToast } from '@/hooks/use-toast';

export interface TeacherRate {
  id: string;
  teacher_id: string;
  rate_type: string;
  branch: string | null;
  subject: string | null;
  rate_per_academic_hour: number;
  currency: string;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  notes: string | null;
  // New fields for Hollihope compatibility
  group_id: string | null;
  individual_lesson_id: string | null;
  min_students: number | null;
  max_students: number | null;
  bonus_percentage: number | null;
  external_id: string | null;
  holihope_metadata: any | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalaryAccrual {
  id: string;
  teacher_id: string;
  lesson_session_id: string | null;
  individual_lesson_session_id: string | null;
  earning_date: string;
  academic_hours: number;
  rate_per_hour: number;
  amount: number;
  currency: string;
  status: string;
  payment_id: string | null;
  notes: string | null;
  teacher_coefficient: number | null;
  created_at: string;
  updated_at: string;
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
      let query = (supabase
        .from('teacher_rates' as any) as any)
        .select('*')
        .order('valid_from', { ascending: false });

      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as TeacherRate[];
    },
    enabled: !!teacherId,
  });
};

export const useTeacherAccruals = (teacherId?: string, periodStart?: string, periodEnd?: string) => {
  return useQuery({
    queryKey: ['teacher-accruals', teacherId, periodStart, periodEnd],
    queryFn: async () => {
      let query = (supabase
        .from('teacher_earnings' as any) as any)
        .select('*')
        .order('earning_date', { ascending: false });

      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      }

      if (periodStart) {
        query = query.gte('earning_date', periodStart);
      }

      if (periodEnd) {
        query = query.lte('earning_date', periodEnd);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SalaryAccrual[];
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
      const { data, error } = await (supabase.rpc as any)('get_teacher_salary_stats', {
        p_teacher_id: teacherId,
        p_period_start: periodStart,
        p_period_end: periodEnd,
      });

      if (error) throw error;
      return (data as any)?.[0] as SalaryStats;
    },
    enabled: !!teacherId,
  });
};

// Создать/обновить ставку
export const useUpsertTeacherRate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (rate: Partial<TeacherRate> & { teacher_id: string; rate_type: string; rate_per_academic_hour: number; valid_from: string }) => {
      if (rate.id) {
        // Update existing rate
        const { data, error } = await (supabase
          .from('teacher_rates' as any) as any)
          .update({
            rate_type: rate.rate_type,
            rate_per_academic_hour: rate.rate_per_academic_hour,
            valid_from: rate.valid_from,
            valid_until: rate.valid_until || null,
            branch: rate.branch || null,
            subject: rate.subject || null,
            notes: rate.notes || null,
            is_active: rate.is_active ?? true,
          })
          .eq('id', rate.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Insert new rate
        const { data, error } = await (supabase
          .from('teacher_rates' as any) as any)
          .insert({
            teacher_id: rate.teacher_id,
            rate_type: rate.rate_type,
            rate_per_academic_hour: rate.rate_per_academic_hour,
            valid_from: rate.valid_from,
            valid_until: rate.valid_until || null,
            branch: rate.branch || null,
            subject: rate.subject || null,
            notes: rate.notes || null,
            is_active: rate.is_active ?? true,
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
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
      const { error } = await (supabase
        .from('teacher_rates' as any) as any)
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
      const { error } = await (supabase
        .from('teacher_earnings' as any) as any)
        .update({
          status: 'paid',
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
