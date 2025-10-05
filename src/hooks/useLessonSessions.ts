import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface LessonSession {
  id: string;
  group_id: string;
  teacher_name: string;
  branch: string;
  classroom: string;
  lesson_date: string;
  start_time: string;
  end_time: string;
  day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  status: 'scheduled' | 'cancelled' | 'completed' | 'rescheduled';
  notes?: string;
  created_at: string;
  updated_at: string;
  paid_minutes?: number;
  payment_id?: string;
  payment_date?: string;
  payment_amount?: number;
  lessons_count?: number;
}

export interface ScheduleConflict {
  conflict_type: 'teacher' | 'classroom';
  conflicting_teacher: string;
  conflicting_classroom: string;
  conflicting_group_id: string;
  conflicting_time_range: string;
}

export interface SessionFilters {
  branch?: string;
  teacher?: string;
  classroom?: string;
  date_from?: string;
  date_to?: string;
  status?: string;
}

// Hook для получения занятий с фильтрами
export const useLessonSessions = (filters: SessionFilters = {}) => {
  const queryClient = useQueryClient();

  // Realtime подписка на любые изменения в таблице lesson_sessions
  useEffect(() => {
    const channel = supabase
      .channel('lesson_sessions_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lesson_sessions' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['lesson_sessions'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['lesson_sessions', filters],
    queryFn: async () => {
      let query = supabase
        .from('lesson_sessions')
        .select(`
          *,
          learning_groups:group_id (
            id,
            name,
            level,
            subject
          ),
          lessons:course_lesson_id (
            id,
            title,
            lesson_number,
            objectives,
            homework
          )
        `)
        .order('lesson_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (filters.branch) {
        query = query.eq('branch', filters.branch);
      }

      if (filters.teacher) {
        query = query.eq('teacher_name', filters.teacher);
      }

      if (filters.classroom) {
        query = query.eq('classroom', filters.classroom);
      }

      if (filters.date_from) {
        query = query.gte('lesson_date', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('lesson_date', filters.date_to);
      }

      if (filters.status && ['scheduled', 'cancelled', 'completed', 'rescheduled'].includes(filters.status)) {
        query = query.eq('status', filters.status as LessonSession['status']);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as (LessonSession & { learning_groups: { id: string; name: string; level: string; subject: string } })[];
    },
  });
};

// Hook для создания занятия
export const useCreateLessonSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (session: Omit<LessonSession, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('lesson_sessions')
        .insert(session)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson_sessions'] });
    },
  });
};

// Hook для обновления занятия
export const useUpdateLessonSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LessonSession> }) => {
      const { data: result, error } = await supabase
        .from('lesson_sessions')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson_sessions'] });
    },
  });
};

// Hook для удаления занятия
export const useDeleteLessonSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lesson_sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson_sessions'] });
    },
  });
};

// Hook для проверки конфликтов расписания
export const useCheckScheduleConflicts = () => {
  return useMutation({
    mutationFn: async ({
      teacher_name,
      branch,
      classroom,
      lesson_date,
      start_time,
      end_time,
      exclude_session_id
    }: {
      teacher_name: string;
      branch: string;
      classroom: string;
      lesson_date: string;
      start_time: string;
      end_time: string;
      exclude_session_id?: string;
    }) => {
      const { data, error } = await supabase.rpc('get_schedule_conflicts', {
        p_teacher_name: teacher_name,
        p_branch: branch,
        p_classroom: classroom,
        p_lesson_date: lesson_date,
        p_start_time: start_time,
        p_end_time: end_time,
        p_exclude_session_id: exclude_session_id || null
      });

      if (error) throw error;
      return data as ScheduleConflict[];
    },
  });
};

// Вспомогательные функции
export const getDayLabel = (day: string): string => {
  const dayLabels = {
    'monday': 'Понедельник',
    'tuesday': 'Вторник', 
    'wednesday': 'Среда',
    'thursday': 'Четверг',
    'friday': 'Пятница',
    'saturday': 'Суббота',
    'sunday': 'Воскресенье'
  };
  return dayLabels[day as keyof typeof dayLabels] || day;
};

export const getStatusLabel = (status: string): string => {
  const statusLabels = {
    'scheduled': 'Запланировано',
    'cancelled': 'Отменено',
    'completed': 'Проведено',
    'rescheduled': 'Перенесено'
  };
  return statusLabels[status as keyof typeof statusLabels] || status;
};

export const getStatusColor = (status: string): string => {
  const statusColors = {
    'scheduled': 'bg-blue-100 text-blue-700 border-blue-200',
    'cancelled': 'bg-red-100 text-red-700 border-red-200',
    'completed': 'bg-green-100 text-green-700 border-green-200',
    'rescheduled': 'bg-yellow-100 text-yellow-700 border-yellow-200'
  };
  return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-700 border-gray-200';
};