import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { toast } from 'sonner';

export interface StudentSegment {
  id: string;
  name: string;
  description?: string;
  filters: Record<string, any>;
  created_by: string;
  is_global: boolean;
  created_at: string;
  updated_at: string;
}

export const useStudentSegments = () => {
  return useQuery({
    queryKey: ['student-segments'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await (supabase
        .from('student_segments' as any) as any)
        .select('*')
        .or(`created_by.eq.${user.id},is_global.eq.true`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as StudentSegment[];
    },
  });
};

export const useCreateStudentSegment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (segment: Omit<StudentSegment, 'id' | 'created_by' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await (supabase
        .from('student_segments' as any) as any)
        .insert([{ ...segment, created_by: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-segments'] });
      toast.success('Сегмент создан');
    },
    onError: (error) => {
      console.error('Error creating segment:', error);
      toast.error('Ошибка при создании сегмента');
    },
  });
};

export const useUpdateStudentSegment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...segment }: Partial<StudentSegment> & { id: string }) => {
      const { data, error } = await (supabase
        .from('student_segments' as any) as any)
        .update(segment)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-segments'] });
      toast.success('Сегмент обновлен');
    },
    onError: (error) => {
      console.error('Error updating segment:', error);
      toast.error('Ошибка при обновлении сегмента');
    },
  });
};

export const useDeleteStudentSegment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('student_segments' as any) as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-segments'] });
      toast.success('Сегмент удален');
    },
    onError: (error) => {
      console.error('Error deleting segment:', error);
      toast.error('Ошибка при удалении сегмента');
    },
  });
};
