import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import type { Teacher, LearningGroup, LessonSession } from '@/integrations/supabase/database.types';

export interface TeacherProfile extends Teacher {
  groups: LearningGroup[];
  recentLessons: LessonSession[];
  stats: {
    totalGroups: number;
    activeGroups: number;
    totalLessons: number;
    completedLessons: number;
    cancelledLessons: number;
  };
}

export const useTeacherProfile = (teacherId: string | undefined) => {
  return useQuery({
    queryKey: ['teacher-profile', teacherId],
    queryFn: async (): Promise<TeacherProfile | null> => {
      if (!teacherId) return null;

      // Получаем преподавателя
      const { data: teacher, error: teacherError } = await supabase
        .from('teachers')
        .select('*')
        .eq('id', teacherId)
        .single();

      if (teacherError) throw teacherError;
      if (!teacher) return null;

      // Получаем группы преподавателя
      const { data: groups, error: groupsError } = await supabase
        .from('learning_groups')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (groupsError) throw groupsError;

      // Получаем уроки преподавателя за последние 30 дней
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: lessons, error: lessonsError } = await supabase
        .from('lesson_sessions')
        .select('*')
        .eq('teacher_id', teacherId)
        .gte('lesson_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('lesson_date', { ascending: false })
        .order('start_time', { ascending: false })
        .limit(50);

      if (lessonsError) throw lessonsError;

      // Получаем общую статистику уроков
      const { data: allLessons, error: allLessonsError } = await supabase
        .from('lesson_sessions')
        .select('status')
        .eq('teacher_id', teacherId);

      if (allLessonsError) throw allLessonsError;

      const stats = {
        totalGroups: groups?.length || 0,
        activeGroups: groups?.filter(g => g.is_active).length || 0,
        totalLessons: allLessons?.length || 0,
        completedLessons: allLessons?.filter(l => l.status === 'completed').length || 0,
        cancelledLessons: allLessons?.filter(l => l.status === 'cancelled').length || 0,
      };

      return {
        ...teacher,
        groups: groups || [],
        recentLessons: lessons || [],
        stats,
      };
    },
    enabled: !!teacherId,
  });
};
