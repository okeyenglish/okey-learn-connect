import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useToast } from '@/hooks/use-toast';

export interface GenerateScheduleParams {
  groupId: string;
  courseId: string;
  startDate: string;
  scheduleDays: string[];
  startTime: string;
  endTime: string;
  teacherName: string;
  classroom: string;
  branch: string;
  totalLessons?: number;
}

export const useGenerateCourseSchedule = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: GenerateScheduleParams) => {
      // Конвертируем дни недели из русского формата в английский
      const dayMapping: Record<string, string> = {
        'пн': 'monday',
        'вт': 'tuesday', 
        'ср': 'wednesday',
        'чт': 'thursday',
        'пт': 'friday',
        'сб': 'saturday',
        'вс': 'sunday'
      };

      const englishDays = params.scheduleDays.map(day => dayMapping[day] || day);

      const { error } = await supabase.rpc('generate_course_schedule', {
        p_group_id: params.groupId,
        p_course_id: params.courseId,
        p_start_date: params.startDate,
        p_schedule_days: englishDays,
        p_start_time: params.startTime,
        p_end_time: params.endTime,
        p_teacher_name: params.teacherName,
        p_classroom: params.classroom,
        p_branch: params.branch,
        p_total_lessons: params.totalLessons || 80
      });

      if (error) {
        throw error;
      }

      return { success: true };
    },
    onSuccess: () => {
      // Обновляем кэш расписания и групп
      queryClient.invalidateQueries({ queryKey: ['lesson-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['learning-groups'] });
      
      toast({
        title: "Успешно",
        description: "Расписание курса автоматически сгенерировано"
      });
    },
    onError: (error) => {
      console.error('Error generating schedule:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать расписание курса",
        variant: "destructive"
      });
    }
  });
};

// Хук для получения расписания группы с информацией о курсе
export const useGroupScheduleWithCourse = (groupId?: string) => {
  return useMutation({
    mutationFn: async () => {
      if (!groupId) return [];

      const { data, error } = await supabase
        .from('lesson_sessions')
        .select(`
          *,
          lessons (
            id,
            title,
            lesson_number,
            objectives,
            homework,
            course_units (
              title,
              unit_number,
              vocabulary,
              grammar
            )
          )
        `)
        .eq('group_id', groupId)
        .order('lesson_date');

      if (error) throw error;
      return data || [];
    }
  });
};