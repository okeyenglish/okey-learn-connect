import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StudentParent {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  relationship: 'parent' | 'mother' | 'father' | 'guardian' | 'other';
  phone?: string;
  email?: string;
  is_primary_contact: boolean;
  notification_preferences: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
  created_at: string;
  updated_at: string;
}

export const useStudentParents = (studentId: string) => {
  return useQuery({
    queryKey: ['student-parents', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_parents')
        .select('*')
        .eq('student_id', studentId)
        .order('is_primary_contact', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as StudentParent[];
    },
    enabled: !!studentId,
  });
};

export const useCreateStudentParent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (parent: Omit<StudentParent, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('student_parents')
        .insert([parent])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-parents', variables.student_id] });
      queryClient.invalidateQueries({ queryKey: ['student-details', variables.student_id] });
      toast.success('Родитель добавлен');
    },
    onError: (error) => {
      console.error('Error creating parent:', error);
      toast.error('Ошибка при добавлении родителя');
    },
  });
};

export const useUpdateStudentParent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...parent }: Partial<StudentParent> & { id: string }) => {
      const { data, error } = await supabase
        .from('student_parents')
        .update(parent)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['student-parents', data.student_id] });
      queryClient.invalidateQueries({ queryKey: ['student-details', data.student_id] });
      toast.success('Информация о родителе обновлена');
    },
    onError: (error) => {
      console.error('Error updating parent:', error);
      toast.error('Ошибка при обновлении родителя');
    },
  });
};

export const useDeleteStudentParent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, studentId }: { id: string; studentId: string }) => {
      const { error } = await supabase
        .from('student_parents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { studentId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['student-parents', data.studentId] });
      queryClient.invalidateQueries({ queryKey: ['student-details', data.studentId] });
      toast.success('Родитель удален');
    },
    onError: (error) => {
      console.error('Error deleting parent:', error);
      toast.error('Ошибка при удалении родителя');
    },
  });
};
