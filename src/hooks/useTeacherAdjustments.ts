import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TeacherAdjustment {
  id: string;
  teacher_id: string;
  adjustment_type: 'bonus' | 'deduction' | 'penalty' | 'other';
  amount: number;
  currency: string;
  adjustment_date: string;
  description?: string;
  status: 'pending' | 'paid' | 'cancelled';
  payment_id?: string;
  external_id?: string;
  holihope_metadata?: any;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Получить корректировки преподавателя
export const useTeacherAdjustments = (
  teacherId?: string,
  periodStart?: string,
  periodEnd?: string
) => {
  return useQuery({
    queryKey: ['teacher-adjustments', teacherId, periodStart, periodEnd],
    queryFn: async () => {
      let query = supabase
        .from('teacher_adjustments' as any)
        .select('*')
        .order('adjustment_date', { ascending: false });

      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      }

      if (periodStart) {
        query = query.gte('adjustment_date', periodStart);
      }

      if (periodEnd) {
        query = query.lte('adjustment_date', periodEnd);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any as TeacherAdjustment[];
    },
    enabled: !!teacherId,
  });
};

// Создать корректировку
export const useCreateAdjustment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (adjustment: Omit<TeacherAdjustment, 'id' | 'created_at' | 'updated_at' | 'status'> & { status?: string }) => {
      const { data, error } = await supabase
        .from('teacher_adjustments' as any)
        .insert({
          teacher_id: adjustment.teacher_id,
          adjustment_type: adjustment.adjustment_type,
          amount: adjustment.amount,
          currency: adjustment.currency || 'RUB',
          adjustment_date: adjustment.adjustment_date || new Date().toISOString().split('T')[0],
          description: adjustment.description,
          status: adjustment.status || 'pending',
          external_id: adjustment.external_id,
          holihope_metadata: adjustment.holihope_metadata,
          created_by: adjustment.created_by,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teacher-adjustments', variables.teacher_id] });
      queryClient.invalidateQueries({ queryKey: ['teacher-salary-stats', variables.teacher_id] });
      toast({
        title: 'Успешно',
        description: 'Корректировка добавлена',
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

// Обновить корректировку
export const useUpdateAdjustment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<TeacherAdjustment> & { id: string }) => {
      const { data, error } = await supabase
        .from('teacher_adjustments' as any)
        .update({
          ...update,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-salary-stats'] });
      toast({
        title: 'Успешно',
        description: 'Корректировка обновлена',
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

// Удалить корректировку
export const useDeleteAdjustment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('teacher_adjustments' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-salary-stats'] });
      toast({
        title: 'Успешно',
        description: 'Корректировка удалена',
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

// Отметить корректировки как оплаченные
export const useMarkAdjustmentsPaid = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('teacher_adjustments' as any)
        .update({ status: 'paid' })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-salary-stats'] });
      toast({
        title: 'Успешно',
        description: 'Корректировки отмечены как оплаченные',
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

// Получить сумму корректировок за период
export const calculateAdjustmentsTotal = (
  adjustments: TeacherAdjustment[],
  status?: 'pending' | 'paid' | 'cancelled'
): { bonuses: number; deductions: number; net: number } => {
  const filtered = status 
    ? adjustments.filter(a => a.status === status)
    : adjustments.filter(a => a.status !== 'cancelled');
  
  let bonuses = 0;
  let deductions = 0;
  
  for (const adj of filtered) {
    if (adj.adjustment_type === 'bonus') {
      bonuses += adj.amount;
    } else {
      deductions += adj.amount;
    }
  }
  
  return {
    bonuses,
    deductions,
    net: bonuses - deductions,
  };
};
