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

/** DB row for student payer */
interface StudentPayerRow {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  relationship: string;
  phone: string | null;
  email: string | null;
  payment_method: string | null;
  is_invoice_recipient: boolean;
  created_at: string;
  updated_at: string;
}

export const useStudentPayer = (studentId: string) => {
  return useQuery({
    queryKey: ['student-payer', studentId],
    queryFn: async (): Promise<StudentPayer | null> => {
      const { data, error } = await supabase
        .from('student_payers')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const row = data as unknown as StudentPayerRow;
      return {
        id: row.id,
        student_id: row.student_id,
        first_name: row.first_name,
        last_name: row.last_name,
        middle_name: row.middle_name ?? undefined,
        relationship: row.relationship as StudentPayer['relationship'],
        phone: row.phone ?? undefined,
        email: row.email ?? undefined,
        payment_method: row.payment_method as StudentPayer['payment_method'],
        is_invoice_recipient: row.is_invoice_recipient,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    },
    enabled: !!studentId,
  });
};

export const useUpsertStudentPayer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payer: Omit<StudentPayer, 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('student_payers')
        .upsert([payer], { onConflict: 'student_id' })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as StudentPayerRow;
    },
    onSuccess: (data) => {
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
      const { error } = await supabase
        .from('student_payers')
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
