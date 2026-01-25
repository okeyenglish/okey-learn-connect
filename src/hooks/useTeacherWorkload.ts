import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { startOfWeek, endOfWeek, format } from 'date-fns';

export const useTeacherWorkload = (teacherName: string) => {
  return useQuery({
    queryKey: ['teacher-workload', teacherName],
    queryFn: async () => {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

      // Получаем группы преподавателя
      const { data: groups, error: groupsError } = await (supabase
        .from('learning_groups' as any) as any)
        .select('id')
        .eq('responsible_teacher', teacherName)
        .eq('is_active', true);

      if (groupsError) throw groupsError;

      // Получаем индивидуальные занятия
      const { data: individualLessons, error: individualError } = await (supabase
        .from('individual_lessons' as any) as any)
        .select('id')
        .eq('teacher_name', teacherName)
        .eq('is_active', true);

      if (individualError) throw individualError;

      // Получаем занятия на эту неделю
      const { data: weekSessions, error: sessionsError } = await (supabase
        .from('lesson_sessions' as any) as any)
        .select('id, start_time, end_time')
        .eq('teacher_name', teacherName)
        .gte('lesson_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('lesson_date', format(weekEnd, 'yyyy-MM-dd'))
        .in('status', ['scheduled', 'completed']);

      if (sessionsError) throw sessionsError;

      // Подсчитываем часы в неделю
      const weeklyHours = (weekSessions || []).reduce((total: number, session: any) => {
        const start = new Date(`2000-01-01T${session.start_time}`);
        const end = new Date(`2000-01-01T${session.end_time}`);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + hours;
      }, 0);

      return {
        weekly_hours: Math.round(weeklyHours * 10) / 10,
        groups_count: groups?.length || 0,
        individual_students: individualLessons?.length || 0,
        lessons_per_week: weekSessions?.length || 0,
      };
    },
    enabled: !!teacherName,
  });
};

export const useTeacherLessonsHistory = (teacherName: string, months: number = 6) => {
  return useQuery({
    queryKey: ['teacher-lessons-history', teacherName, months],
    queryFn: async () => {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);

      const { data, error } = await (supabase
        .from('lesson_sessions' as any) as any)
        .select('lesson_date, status, start_time, end_time')
        .eq('teacher_name', teacherName)
        .gte('lesson_date', format(startDate, 'yyyy-MM-dd'))
        .lte('lesson_date', format(now, 'yyyy-MM-dd'))
        .in('status', ['completed', 'cancelled']);

      if (error) throw error;

      // Группируем по месяцам
      const monthlyStats = (data || []).reduce((acc: any, session: any) => {
        const month = format(new Date(session.lesson_date), 'yyyy-MM');
        if (!acc[month]) {
          acc[month] = {
            month,
            completed: 0,
            cancelled: 0,
            total_hours: 0,
          };
        }

        if (session.status === 'completed') {
          acc[month].completed++;
          const start = new Date(`2000-01-01T${session.start_time}`);
          const end = new Date(`2000-01-01T${session.end_time}`);
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          acc[month].total_hours += hours;
        } else if (session.status === 'cancelled') {
          acc[month].cancelled++;
        }

        return acc;
      }, {});

      return Object.values(monthlyStats).sort((a: any, b: any) => 
        a.month.localeCompare(b.month)
      );
    },
    enabled: !!teacherName,
  });
};
