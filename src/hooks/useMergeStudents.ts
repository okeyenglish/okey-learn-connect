import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MergeStudentsParams {
  primaryId: string;
  duplicateIds: string[];
}

export const useMergeStudents = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ primaryId, duplicateIds }: MergeStudentsParams) => {
      // 1. Переносим все связи на основного студента
      
      // Переносим записи в группах
      const { error: groupError } = await supabase
        .from('group_students')
        .update({ student_id: primaryId } as any)
        .in('student_id', duplicateIds);

      if (groupError) {
        console.error('Error merging group_students:', groupError);
      }

      // Переносим индивидуальные занятия
      const { error: lessonsError } = await supabase
        .from('individual_lessons')
        .update({ student_id: primaryId } as any)
        .in('student_id', duplicateIds);

      if (lessonsError) {
        console.error('Error merging individual_lessons:', lessonsError);
      }

      // Переносим платежи
      const { error: paymentsError } = await supabase
        .from('payments')
        .update({ student_id: primaryId } as any)
        .in('student_id', duplicateIds);

      if (paymentsError) {
        console.error('Error merging payments:', paymentsError);
      }

      // Переносим историю
      const { error: historyError } = await supabase
        .from('student_history')
        .update({ student_id: primaryId } as any)
        .in('student_id', duplicateIds);

      if (historyError) {
        console.error('Error merging student_history:', historyError);
      }

      // Переносим баланс (объединяем)
      const { data: balances } = await supabase
        .from('student_balances')
        .select('balance')
        .in('student_id', duplicateIds);

      if (balances && balances.length > 0) {
        const totalBalance = balances.reduce((sum, b) => sum + (b.balance || 0), 0);
        
        // Обновляем баланс основного студента
        await supabase
          .from('student_balances')
          .upsert({
            student_id: primaryId,
            balance: totalBalance,
          } as any);

        // Удаляем балансы дубликатов
        await supabase
          .from('student_balances')
          .delete()
          .in('student_id', duplicateIds);
      }

      // 2. Помечаем дубликаты как архивные
      const { error: archiveError } = await supabase
        .from('students')
        .update({ 
          status: 'archived',
          notes: 'Объединен с основной записью'
        } as any)
        .in('id', duplicateIds);

      if (archiveError) throw archiveError;

      // 3. Добавляем запись в историю основного студента
      await supabase
        .from('student_history')
        .insert({
          student_id: primaryId,
          event_type: 'merge',
          event_category: 'system',
          title: 'Объединение дубликатов',
          description: `Объединено ${duplicateIds.length} дубликатов записей`,
          new_value: { merged_ids: duplicateIds },
          changed_by: (await supabase.auth.getUser()).data.user?.id,
        } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student-duplicates'] });
      toast.success('Записи успешно объединены');
    },
    onError: (error) => {
      console.error('Error merging students:', error);
      toast.error('Ошибка при объединении записей');
    },
  });
};
