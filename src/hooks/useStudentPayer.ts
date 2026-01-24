import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { toast } from 'sonner';

export interface StudentPayer {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  relationship: 'parent' | 'guardian' | 'self' | 'other';
  phone?: string;
  email?: string;
  payment_method?: 'cash' | 'card' | 'transfer' | 'online';
  is_invoice_recipient: boolean;
  created_at: string;
  updated_at: string;
}

export const useStudentPayer = (studentId: string) => {
  return useQuery({
    queryKey: ['student-payer', studentId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('student_payers' as any) as any)
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();

      if (error) throw error;
      return data as StudentPayer | null;
    },
    enabled: !!studentId,
  });
};

export const useUpsertStudentPayer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payer: Omit<StudentPayer, 'created_at' | 'updated_at'>) => {
      const { data, error } = await (supabase
        .from('student_payers' as any) as any)
        .upsert([payer], { onConflict: 'student_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['student-payer', data?.student_id] });
      queryClient.invalidateQueries({ queryKey: ['student-details', data?.student_id] });
      toast.success('Информация о плательщике сохранена');
    },
    onError: (error) => {
      console.error('Error saving payer:', error);
      toast.error('Ошибка при сохранении плательщика');
    },
  });
};

export const useDeleteStudentPayer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, studentId }: { id: string; studentId: string }) => {
      const { error } = await (supabase
        .from('student_payers' as any) as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { studentId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['student-payer', data.studentId] });
      queryClient.invalidateQueries({ queryKey: ['student-details', data.studentId] });
      toast.success('Плательщик удален');
    },
    onError: (error) => {
      console.error('Error deleting payer:', error);
      toast.error('Ошибка при удалении плательщика');
    },
  });
};
