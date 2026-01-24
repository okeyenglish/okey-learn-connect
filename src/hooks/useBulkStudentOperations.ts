import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { toast } from 'sonner';

type StudentStatus = 'active' | 'inactive' | 'trial' | 'graduated';

export const useBulkUpdateStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentIds, status }: { studentIds: string[]; status: StudentStatus }) => {
      const { error } = await supabase
        .from('students')
        .update({ status } as any)
        .in('id', studentIds);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success(`Статус обновлен для ${variables.studentIds.length} студентов`);
    },
    onError: (error) => {
      console.error('Error updating student statuses:', error);
      toast.error('Ошибка при обновлении статуса');
    },
  });
};

export const useBulkAddToSegment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentIds, segmentId }: { studentIds: string[]; segmentId: string }) => {
      const records = studentIds.map(studentId => ({
        student_id: studentId,
        segment_id: segmentId,
      }));

      const { error } = await supabase
        .from('student_segments')
        .insert(records as any);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-segments'] });
      toast.success(`${variables.studentIds.length} студентов добавлено в сегмент`);
    },
    onError: (error) => {
      console.error('Error adding students to segment:', error);
      toast.error('Ошибка при добавлении в сегмент');
    },
  });
};

export const useBulkDeleteStudents = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (studentIds: string[]) => {
      const { error } = await supabase
        .from('students')
        .delete()
        .in('id', studentIds);

      if (error) throw error;
    },
    onSuccess: (_, studentIds) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success(`Удалено ${studentIds.length} студентов`);
    },
    onError: (error) => {
      console.error('Error deleting students:', error);
      toast.error('Ошибка при удалении студентов');
    },
  });
};
