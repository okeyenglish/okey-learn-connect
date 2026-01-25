import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { startOfWeek, endOfWeek, format } from 'date-fns';

export interface TeacherLesson {
  id: string;
  lesson_date: string;
  lesson_time?: string;
  lesson_type: 'group' | 'individual';
  subject: string;
  level?: string;
  branch: string;
  group_name?: string;
  student_name?: string;
  status: string;
  duration?: number;
  classroom?: string;
  students_count?: number;
}

export interface TeacherScheduleStats {
  total_lessons: number;
  total_hours: number;
  group_lessons: number;
  individual_lessons: number;
  completed_lessons: number;
  scheduled_lessons: number;
  cancelled_lessons: number;
}

export const useTeacherSchedule = (
  teacherId?: string,
  branchId?: string | 'all',
  startDate?: Date,
  endDate?: Date
) => {
  return useQuery({
    queryKey: ['teacher-schedule', teacherId, branchId, startDate, endDate],
    queryFn: async () => {
      if (!teacherId) return [];

      const start = startDate || startOfWeek(new Date(), { weekStartsOn: 1 });
      const end = endDate || endOfWeek(new Date(), { weekStartsOn: 1 });

      // Получаем групповые занятия преподавателя
      let groupQuery = supabase.from('learning_groups')
        .select('id, name, subject, level, branch, schedule_time')
        .eq('responsible_teacher', teacherId);

      // Фильтруем по филиалу, если выбран конкретный
      if (branchId && branchId !== 'all') {
        const { data: branchData } = await supabase.from('organization_branches')
          .select('name')
          .eq('id', branchId)
          .single();
        
        if (branchData) {
          groupQuery = groupQuery.eq('branch', branchData.name);
        }
      }

      const { data: groupLessonsData } = await groupQuery;

      const groupIds = groupLessonsData?.map((g) => g.id) || [];

      let groupLessons: Array<{
        id: string;
        lesson_date: string;
        status: string | null;
        classroom: string | null;
        group_id: string | null;
        group_data?: typeof groupLessonsData[0];
      }> = [];
      
      if (groupIds.length > 0) {
        const { data, error: groupError } = await supabase.from('lesson_sessions')
          .select(`
            id,
            lesson_date,
            status,
            classroom,
            learning_group_id
          `)
          .gte('lesson_date', format(start, 'yyyy-MM-dd'))
          .lte('lesson_date', format(end, 'yyyy-MM-dd'))
          .in('learning_group_id', groupIds);

        if (groupError) throw groupError;

        // Объединяем с данными группы
        groupLessons = (data || []).map((lesson) => {
          const group = groupLessonsData?.find((g) => g.id === lesson.learning_group_id);
          return {
            id: lesson.id,
            lesson_date: lesson.lesson_date,
            status: lesson.status,
            classroom: lesson.classroom,
            group_id: lesson.learning_group_id,
            group_data: group,
          };
        });
      }

      // Получаем индивидуальные уроки преподавателя
      let individualQuery = supabase.from('individual_lessons')
        .select('id, subject, level, branch, schedule_time, duration, student_name, student_id')
        .eq('teacher_id', teacherId);

      // Фильтруем по филиалу, если выбран конкретный
      if (branchId && branchId !== 'all') {
        const { data: branchData } = await supabase.from('organization_branches')
          .select('name')
          .eq('id', branchId)
          .single();
        
        if (branchData) {
          individualQuery = individualQuery.eq('branch', branchData.name);
        }
      }

      const { data: individualLessonsData } = await individualQuery;

      const lessonIds = individualLessonsData?.map((l) => l.id) || [];

      let individualLessons: Array<{
        id: string;
        lesson_date: string;
        status: string | null;
        duration: number | null;
        individual_lesson_id: string | null;
        lesson_data?: typeof individualLessonsData[0];
      }> = [];
      
      if (lessonIds.length > 0) {
        const { data, error: individualError } = await supabase.from('individual_lesson_sessions')
          .select(`
            id,
            lesson_date,
            status,
            duration,
            individual_lesson_id
          `)
          .gte('lesson_date', format(start, 'yyyy-MM-dd'))
          .lte('lesson_date', format(end, 'yyyy-MM-dd'))
          .in('individual_lesson_id', lessonIds);

        if (individualError) throw individualError;

        // Объединяем с данными урока
        individualLessons = (data || []).map((session) => {
          const lesson = individualLessonsData?.find((l) => l.id === session.individual_lesson_id);
          return {
            id: session.id,
            lesson_date: session.lesson_date,
            status: session.status,
            duration: session.duration,
            individual_lesson_id: session.individual_lesson_id,
            lesson_data: lesson,
          };
        });
      }

      // Форматируем данные
      const formattedGroupLessons: TeacherLesson[] = groupLessons.map((lesson) => ({
        id: lesson.id,
        lesson_date: lesson.lesson_date,
        lesson_time: lesson.group_data?.schedule_time ?? undefined,
        lesson_type: 'group' as const,
        subject: lesson.group_data?.subject || '',
        level: lesson.group_data?.level ?? undefined,
        branch: lesson.group_data?.branch || '',
        group_name: lesson.group_data?.name,
        status: lesson.status || '',
        duration: undefined,
        classroom: lesson.classroom ?? undefined,
      }));

      const formattedIndividualLessons: TeacherLesson[] = individualLessons.map((session) => ({
        id: session.id,
        lesson_date: session.lesson_date,
        lesson_time: session.lesson_data?.schedule_time ?? undefined,
        lesson_type: 'individual' as const,
        subject: session.lesson_data?.subject || '',
        level: session.lesson_data?.level ?? undefined,
        branch: session.lesson_data?.branch || '',
        student_name: session.lesson_data?.student_name ?? undefined,
        status: session.status || '',
        duration: session.duration ?? session.lesson_data?.duration ?? undefined,
      }));

      // Объединяем и сортируем
      return [...formattedGroupLessons, ...formattedIndividualLessons].sort((a, b) => {
        const dateCompare = a.lesson_date.localeCompare(b.lesson_date);
        if (dateCompare !== 0) return dateCompare;

        const timeA = a.lesson_time || '';
        const timeB = b.lesson_time || '';
        return timeA.localeCompare(timeB);
      });
    },
    enabled: !!teacherId,
  });
};

export const useTeacherScheduleStats = (
  teacherId?: string,
  lessons?: TeacherLesson[]
) => {
  if (!teacherId || !lessons) {
    return {
      total_lessons: 0,
      total_hours: 0,
      group_lessons: 0,
      individual_lessons: 0,
      completed_lessons: 0,
      scheduled_lessons: 0,
      cancelled_lessons: 0,
    };
  }

  const stats: TeacherScheduleStats = {
    total_lessons: lessons.length,
    total_hours: lessons.reduce((sum, l) => sum + ((l.duration || 0) / 60), 0),
    group_lessons: lessons.filter((l) => l.lesson_type === 'group').length,
    individual_lessons: lessons.filter((l) => l.lesson_type === 'individual').length,
    completed_lessons: lessons.filter((l) => l.status === 'completed').length,
    scheduled_lessons: lessons.filter((l) => l.status === 'scheduled').length,
    cancelled_lessons: lessons.filter((l) => l.status === 'cancelled').length,
  };

  return stats;
};
