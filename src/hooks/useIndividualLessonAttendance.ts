import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useToast } from '@/hooks/use-toast';

export type AttendanceStatus = 
  | 'scheduled'
  | 'present'
  | 'free'
  | 'paid_absence'
  | 'unpaid_absence'
  | 'partial_payment'
  | 'makeup'
  | 'penalty'
  | 'cancelled'
  | 'rescheduled';

export interface AttendanceUpdate {
  sessionId: string;
  attendance_status: AttendanceStatus;
  notes?: string;
  replacement_teacher?: string;
  homework_text?: string;
  homework_files?: any[];
  show_in_student_portal?: boolean;
}

export const useUpdateAttendance = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (update: AttendanceUpdate) => {
      const { data, error } = await supabase
        .from('individual_lesson_sessions')
        .update({
          status: update.attendance_status === 'present' ? 'completed' : 
                  update.attendance_status === 'cancelled' ? 'cancelled' : 'scheduled',
          notes: update.notes,
        })
        .eq('id', update.sessionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['individual-lesson-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['student-details'] });
      toast({
        title: 'Посещаемость обновлена',
        description: 'Статус занятия успешно изменен',
      });
    },
    onError: (error) => {
      console.error('Error updating attendance:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить посещаемость',
        variant: 'destructive',
      });
    },
  });
};

export const useRescheduleLesson = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      sessionId, 
      newDate, 
      newStartTime, 
      newDuration 
    }: { 
      sessionId: string; 
      newDate: string; 
      newStartTime?: string;
      newDuration?: number;
    }) => {
      // Получаем данные текущей сессии
      const { data: currentSession, error: fetchError } = await supabase
        .from('individual_lesson_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (fetchError) throw fetchError;

      const { data: newSession, error: createError } = await supabase
        .from('individual_lesson_sessions')
        .insert({
          individual_lesson_id: currentSession.individual_lesson_id,
          lesson_date: newDate,
          duration: newDuration || currentSession.duration,
          notes: `Перенос с ${currentSession.lesson_date}`,
          status: 'scheduled',
        })
        .select()
        .single();

      if (createError) throw createError;

      // Помечаем старую сессию как отмененную
      const { error: updateError } = await supabase
        .from('individual_lesson_sessions')
        .update({
          status: 'cancelled',
          notes: `Перенесено на ${newDate}`,
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      return newSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['individual-lesson-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['student-details'] });
      toast({
        title: 'Занятие перенесено',
        description: 'Новое занятие создано на выбранную дату',
      });
    },
    onError: (error) => {
      console.error('Error rescheduling lesson:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось перенести занятие',
        variant: 'destructive',
      });
    },
  });
};

export const useCancelLesson = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      sessionId, 
      reason 
    }: { 
      sessionId: string; 
      reason: string;
    }) => {
      const { data, error } = await supabase
        .from('individual_lesson_sessions')
        .update({
          status: 'cancelled',
          notes: reason,
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['individual-lesson-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['student-details'] });
      toast({
        title: 'Занятие отменено',
        description: 'Занятие успешно отменено',
      });
    },
    onError: (error) => {
      console.error('Error cancelling lesson:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось отменить занятие',
        variant: 'destructive',
      });
    },
  });
};

export const useCreateMakeupLesson = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      lessonId, 
      date, 
      notes 
    }: { 
      lessonId: string; 
      date: string; 
      notes?: string;
    }) => {
      const { data: lesson, error: fetchError } = await supabase
        .from('individual_lessons')
        .select('*')
        .eq('id', lessonId)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('individual_lesson_sessions')
        .insert({
          individual_lesson_id: lessonId,
          lesson_date: date,
          duration: lesson.duration || 60,
          status: 'scheduled',
          notes: notes || 'Отработка (бесплатное занятие)',
          is_additional: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['individual-lesson-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['student-details'] });
      toast({
        title: 'Отработка создана',
        description: 'Бесплатное занятие добавлено',
      });
    },
    onError: (error) => {
      console.error('Error creating makeup lesson:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать отработку',
        variant: 'destructive',
      });
    },
  });
};

export const getAttendanceLabel = (status: AttendanceStatus): string => {
  const labels: Record<AttendanceStatus, string> = {
    scheduled: 'Запланировано',
    present: 'Присутствовал',
    free: 'Бесплатное',
    paid_absence: 'Оплачиваемый пропуск',
    unpaid_absence: 'Неоплачиваемый пропуск',
    partial_payment: 'Частичная оплата',
    makeup: 'Отработка',
    penalty: 'Штрафные часы',
    cancelled: 'Отменено',
    rescheduled: 'Перенесено',
  };
  return labels[status] || status;
};

export const getAttendanceColor = (status: AttendanceStatus): string => {
  const colors: Record<AttendanceStatus, string> = {
    scheduled: 'bg-gray-100 text-gray-800',
    present: 'bg-green-100 text-green-800',
    free: 'bg-blue-100 text-blue-800',
    paid_absence: 'bg-yellow-100 text-yellow-800',
    unpaid_absence: 'bg-red-100 text-red-800',
    partial_payment: 'bg-orange-100 text-orange-800',
    makeup: 'bg-cyan-100 text-cyan-800',
    penalty: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-gray-200 text-gray-600',
    rescheduled: 'bg-indigo-100 text-indigo-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};
