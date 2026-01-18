import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TeacherFloatingRate {
  id: string;
  rate_id: string;
  student_count: number;
  rate_amount: number;
  created_at: string;
  updated_at: string;
}

// Получить плавающие ставки для конкретной ставки преподавателя
export const useTeacherFloatingRates = (rateId?: string) => {
  return useQuery({
    queryKey: ['teacher-floating-rates', rateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_floating_rates' as any)
        .select('*')
        .eq('rate_id', rateId)
        .order('student_count', { ascending: true });

      if (error) throw error;
      return (data || []) as any as TeacherFloatingRate[];
    },
    enabled: !!rateId,
  });
};

// Создать/обновить плавающую ставку
export const useUpsertFloatingRate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (rate: Partial<TeacherFloatingRate> & { rate_id: string; student_count: number; rate_amount: number }) => {
      if (rate.id) {
        const { data, error } = await supabase
          .from('teacher_floating_rates' as any)
          .update({
            student_count: rate.student_count,
            rate_amount: rate.rate_amount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', rate.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('teacher_floating_rates' as any)
          .insert({
            rate_id: rate.rate_id,
            student_count: rate.student_count,
            rate_amount: rate.rate_amount,
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teacher-floating-rates', variables.rate_id] });
      toast({
        title: 'Успешно',
        description: 'Плавающая ставка сохранена',
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

// Удалить плавающую ставку
export const useDeleteFloatingRate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, rateId }: { id: string; rateId: string }) => {
      const { error } = await supabase
        .from('teacher_floating_rates' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
      return rateId;
    },
    onSuccess: (rateId) => {
      queryClient.invalidateQueries({ queryKey: ['teacher-floating-rates', rateId] });
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

// Получить ставку по количеству учеников
export const getFloatingRateForStudentCount = (
  floatingRates: TeacherFloatingRate[],
  studentCount: number,
  defaultRate: number
): number => {
  if (!floatingRates.length) return defaultRate;
  
  // Сортируем по количеству учеников
  const sorted = [...floatingRates].sort((a, b) => a.student_count - b.student_count);
  
  // Находим подходящую ставку (ближайшую меньшую или равную)
  let matchedRate = defaultRate;
  for (const rate of sorted) {
    if (rate.student_count <= studentCount) {
      matchedRate = rate.rate_amount;
    } else {
      break;
    }
  }
  
  return matchedRate;
};
