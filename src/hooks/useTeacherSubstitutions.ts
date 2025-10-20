import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TeacherSubstitution {
  id: string;
  lesson_session_id?: string;
  individual_lesson_session_id?: string;
  original_teacher_id: string;
  substitute_teacher_id: string;
  substitution_date: string;
  reason?: string;
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  created_by: string;
  created_at: string;
  updated_at: string;
  notes?: string;
}

export interface AvailableTeacher {
  teacher_id: string;
  first_name: string;
  last_name: string;
  has_conflict: boolean;
  conflict_count: number;
}

// Получить все замены
export const useTeacherSubstitutions = (filters?: {
  teacherId?: string;
  date?: string;
  status?: string;
}) => {
  return useQuery({
    queryKey: ['teacher-substitutions', filters],
    queryFn: async () => {
      let query = supabase
        .from('teacher_substitutions' as any)
        .select('*')
        .order('substitution_date', { ascending: false });

      if (filters?.teacherId) {
        query = query.or(
          `original_teacher_id.eq.${filters.teacherId},substitute_teacher_id.eq.${filters.teacherId}`
        );
      }

      if (filters?.date) {
        query = query.eq('substitution_date', filters.date);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as TeacherSubstitution[];
    },
  });
};

// Найти доступных преподавателей для замены
export const useFindAvailableTeachers = (
  date?: string,
  time?: string,
  subject?: string,
  branch?: string
) => {
  return useQuery({
    queryKey: ['available-teachers', date, time, subject, branch],
    queryFn: async () => {
      if (!date || !time || !subject || !branch) return [];

      const { data, error } = await supabase.rpc('find_available_teachers' as any, {
        p_date: date,
        p_time: time,
        p_subject: subject,
        p_branch: branch,
      });

      if (error) throw error;
      return (data || []) as unknown as AvailableTeacher[];
    },
    enabled: !!date && !!time && !!subject && !!branch,
  });
};

// Создать замену
export const useCreateSubstitution = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (substitution: Partial<TeacherSubstitution>) => {
      const { data, error } = await supabase
        .from('teacher_substitutions' as any)
        .insert({
          ...substitution,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-substitutions'] });
      toast({
        title: 'Успешно',
        description: 'Замена преподавателя создана',
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

// Обновить статус замены
export const useUpdateSubstitutionStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('teacher_substitutions' as any)
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-substitutions'] });
      toast({
        title: 'Успешно',
        description: 'Статус замены обновлен',
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

// Удалить замену
export const useDeleteSubstitution = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('teacher_substitutions' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-substitutions'] });
      toast({
        title: 'Успешно',
        description: 'Замена удалена',
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
