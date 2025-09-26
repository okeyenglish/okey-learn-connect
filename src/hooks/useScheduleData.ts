import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ScheduleSession {
  id: string;
  type: 'group' | 'individual';
  name: string;
  teacher_name: string;
  branch: string;
  classroom?: string;
  days: string[];
  time: string;
  start_time: string;
  end_time: string;
  level?: string;
  subject?: string;
  student_count?: number;
  capacity?: number;
  status: 'active' | 'paused' | 'completed';
  period_start?: string;
  period_end?: string;
}

export interface ScheduleFilters {
  branch?: string;
  teacher?: string;
  classroom?: string;
  date_from?: string;
  date_to?: string;
  type?: 'group' | 'individual';
}

// Hook для получения расписания из групп и индивидуальных занятий
export const useScheduleData = (filters: ScheduleFilters = {}) => {
  return useQuery({
    queryKey: ['schedule_data', filters],
    queryFn: async () => {
      const sessions: ScheduleSession[] = [];

      // Получаем групповые занятия  
      let groupQuery = supabase
        .from('learning_groups')
        .select(`
          id,
          name,
          branch,
          level,
          subject,
          capacity,
          status,
          period_start,
          period_end,
          group_students:group_students(count)
        `);

      if (filters.branch) {
        groupQuery = groupQuery.eq('branch', filters.branch);
      }

      const { data: groups, error: groupError } = await groupQuery;
      if (groupError) throw groupError;

      // Преобразуем групповые занятия в сессии
      groups?.forEach(group => {
        sessions.push({
          id: group.id,
          type: 'group',
          name: group.name,
          teacher_name: 'Не назначен',
          branch: group.branch,
          classroom: 'Аудитория',
          days: ['monday', 'wednesday'], // Временная заглушка
          time: '10:00-11:30',
          start_time: '10:00',
          end_time: '11:30',
          level: group.level,
          subject: group.subject,
          student_count: (group.group_students as any)?.[0]?.count || 0,
          capacity: group.capacity,
          status: group.status === 'active' ? 'active' : 'paused',
          period_start: group.period_start,
          period_end: group.period_end
        });
      });

      // Получаем индивидуальные занятия
      let individualQuery = supabase
        .from('individual_lessons')
        .select(`
          id,
          student_name,
          teacher_name,
          branch,
          lesson_location,
          schedule_days,
          schedule_time,
          level,
          subject,
          status,
          period_start,
          period_end
        `);

      if (filters.branch) {
        individualQuery = individualQuery.eq('branch', filters.branch);
      }

      const { data: individual, error: individualError } = await individualQuery;
      if (individualError) throw individualError;

      // Преобразуем индивидуальные занятия в сессии
      individual?.forEach(lesson => {
        const [startTime, endTime] = lesson.schedule_time?.split('-') || ['', ''];
        sessions.push({
          id: lesson.id,
          type: 'individual',
          name: `Индивидуально: ${lesson.student_name}`,
          teacher_name: lesson.teacher_name || 'Не назначен',
          branch: lesson.branch,
          classroom: lesson.lesson_location,
          days: lesson.schedule_days || [],
          time: lesson.schedule_time || '',
          start_time: startTime,
          end_time: endTime,
          level: lesson.level,
          subject: lesson.subject,
          student_count: 1,
          capacity: 1,
          status: lesson.status === 'active' ? 'active' : 
                  lesson.status === 'suspended' ? 'paused' : 'completed',
          period_start: lesson.period_start,
          period_end: lesson.period_end
        });
      });

      return sessions;
    },
  });
};

// Hook для получения доступных аудиторий
export const useClassrooms = (branch?: string) => {
  return useQuery({
    queryKey: ['classrooms', branch],
    queryFn: async () => {
      let query = supabase
        .from('classrooms')
        .select('*')
        .eq('is_active', true);

      if (branch) {
        query = query.eq('branch', branch);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

// Вспомогательные функции
export const getSessionStatusColor = (status: string): string => {
  const statusColors = {
    'active': 'bg-blue-100 text-blue-800 border-blue-200',
    'paused': 'bg-yellow-100 text-yellow-800 border-yellow-200', 
    'completed': 'bg-green-100 text-green-800 border-green-200',
    'no_teacher': 'bg-amber-100 text-amber-800 border-amber-200',
    'other_location': 'bg-purple-100 text-purple-800 border-purple-200',
    'cancelled': 'bg-gray-900 text-white border-gray-900'
  };
  return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-700 border-gray-200';
};

export const getSessionStatusLabel = (status: string): string => {
  const statusLabels = {
    'active': 'Текущие занятия',
    'paused': 'Заканчиваются',
    'completed': 'Начинаются',
    'no_teacher': 'Нет преподавателя',
    'other_location': 'Другое место',
    'cancelled': 'Отменено'
  };
  return statusLabels[status as keyof typeof statusLabels] || status;
};

export const getDayNames = (days: string[]): string => {
  const dayMap = {
    'monday': 'Пн',
    'tuesday': 'Вт', 
    'wednesday': 'Ср',
    'thursday': 'Чт',
    'friday': 'Пт',
    'saturday': 'Сб',
    'sunday': 'Вс'
  };
  
  return days.map(day => dayMap[day as keyof typeof dayMap] || day).join('/');
};