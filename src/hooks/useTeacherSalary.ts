import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TeacherRate {
  id: string;
  teacher_id: string;
  rate_type: 'global' | 'branch' | 'subject' | 'personal';
  branch?: string;
  subject?: string;
  rate_per_academic_hour: number;
  currency: string;
  valid_from: string;
  valid_until?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TeacherEarning {
  id: string;
  teacher_id: string;
  lesson_session_id?: string;
  individual_lesson_session_id?: string;
  earning_date: string;
  academic_hours: number;
  rate_per_hour: number;
  amount: number;
  currency: string;
  status: 'accrued' | 'paid' | 'cancelled';
  payment_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TeacherPayment {
  id: string;
  teacher_id: string;
  payment_type: 'advance' | 'balance' | 'salary' | 'bonus' | 'penalty';
  period_start: string;
  period_end: string;
  total_hours: number;
  rate_per_hour?: number;
  calculated_amount: number;
  adjustments: number;
  final_amount: number;
  currency: string;
  payment_date?: string;
  payment_method?: string;
  status: 'pending' | 'paid' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Получить ставки преподавателя
export const useTeacherRates = (teacherId?: string) => {
  return useQuery({
    queryKey: ['teacher-rates', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      
      const { data, error } = await supabase
        .from('teacher_rates' as any)
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('is_active', true)
        .order('valid_from', { ascending: false });

      if (error) throw error;
      return (data || []) as any as TeacherRate[];
    },
    enabled: !!teacherId,
  });
};

// Получить начисления преподавателя
export const useTeacherEarnings = (teacherId?: string, startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['teacher-earnings', teacherId, startDate, endDate],
    queryFn: async () => {
      if (!teacherId) return [];
      
      let query = supabase
        .from('teacher_earnings' as any)
        .select('*')
        .eq('teacher_id', teacherId);

      if (startDate) {
        query = query.gte('earning_date', startDate);
      }
      if (endDate) {
        query = query.lte('earning_date', endDate);
      }

      const { data, error } = await query.order('earning_date', { ascending: false });

      if (error) throw error;
      return (data || []) as any as TeacherEarning[];
    },
    enabled: !!teacherId,
  });
};

// Получить выплаты преподавателя
export const useTeacherPayments = (teacherId?: string) => {
  return useQuery({
    queryKey: ['teacher-payments', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      
      const { data, error } = await supabase
        .from('teacher_payments' as any)
        .select('*')
        .eq('teacher_id', teacherId)
        .order('period_start', { ascending: false });

      if (error) throw error;
      return (data || []) as any as TeacherPayment[];
    },
    enabled: !!teacherId,
  });
};

// Создать/обновить ставку
export const useSetTeacherRate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      teacherId,
      rateType,
      ratePerAcademicHour,
      branch,
      subject,
      validFrom,
      validUntil,
      notes,
    }: {
      teacherId: string;
      rateType: 'global' | 'branch' | 'subject' | 'personal';
      ratePerAcademicHour: number;
      branch?: string;
      subject?: string;
      validFrom?: string;
      validUntil?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('teacher_rates' as any)
        .insert({
          teacher_id: teacherId,
          rate_type: rateType,
          rate_per_academic_hour: ratePerAcademicHour,
          branch,
          subject,
          valid_from: validFrom || new Date().toISOString().split('T')[0],
          valid_until: validUntil,
          notes,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teacher-rates', variables.teacherId] });
      toast({
        title: "Успешно",
        description: "Ставка установлена",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось установить ставку",
        variant: "destructive",
      });
    },
  });
};

// Рассчитать зарплату за период
export const useCalculateTeacherSalary = () => {
  return useMutation({
    mutationFn: async ({
      teacherId,
      periodStart,
      periodEnd,
    }: {
      teacherId: string;
      periodStart: string;
      periodEnd: string;
    }) => {
      const { data, error } = await supabase.rpc('calculate_teacher_salary' as any, {
        _teacher_id: teacherId,
        _period_start: periodStart,
        _period_end: periodEnd,
      });

      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    },
  });
};

// Создать выплату
export const useCreateTeacherPayment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      teacherId,
      paymentType,
      periodStart,
      periodEnd,
      totalHours,
      ratePerHour,
      calculatedAmount,
      adjustments,
      finalAmount,
      paymentDate,
      paymentMethod,
      notes,
    }: {
      teacherId: string;
      paymentType: 'advance' | 'balance' | 'salary' | 'bonus' | 'penalty';
      periodStart: string;
      periodEnd: string;
      totalHours: number;
      ratePerHour?: number;
      calculatedAmount: number;
      adjustments: number;
      finalAmount: number;
      paymentDate?: string;
      paymentMethod?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('teacher_payments' as any)
        .insert({
          teacher_id: teacherId,
          payment_type: paymentType,
          period_start: periodStart,
          period_end: periodEnd,
          total_hours: totalHours,
          rate_per_hour: ratePerHour,
          calculated_amount: calculatedAmount,
          adjustments,
          final_amount: finalAmount,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          status: paymentDate ? 'paid' : 'pending',
          notes,
        })
        .select()
        .single();

      if (error) throw error;

      // Обновляем статус начислений
      if (paymentDate) {
        await supabase
          .from('teacher_earnings' as any)
          .update({
            status: 'paid',
            payment_id: (data as any).id,
          })
          .eq('teacher_id', teacherId)
          .gte('earning_date', periodStart)
          .lte('earning_date', periodEnd)
          .eq('status', 'accrued');
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teacher-payments', variables.teacherId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-earnings', variables.teacherId] });
      toast({
        title: "Успешно",
        description: "Выплата создана",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать выплату",
        variant: "destructive",
      });
    },
  });
};

// Начислить зарплату за урок
export const useAccrueEarningForLesson = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      lessonSessionId,
      individualLessonSessionId,
    }: {
      lessonSessionId?: string;
      individualLessonSessionId?: string;
    }) => {
      const { data, error } = await supabase.rpc('accrue_teacher_earning_for_lesson' as any, {
        _lesson_session_id: lessonSessionId || null,
        _individual_lesson_session_id: individualLessonSessionId || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-earnings'] });
    },
  });
};
