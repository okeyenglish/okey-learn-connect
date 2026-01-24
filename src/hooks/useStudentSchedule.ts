import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export interface StudentLesson {
  id: string;
  lesson_date: string;
  lesson_time?: string;
  lesson_type: 'group' | 'individual';
  subject: string;
  level?: string;
  branch: string;
  teacher_name?: string;
  teacher_id?: string;
  group_name?: string;
  status: string;
  duration?: number;
  notes?: string;
  classroom?: string;
  attendance_status?: string;
  homework?: string;
}

export const useStudentSchedule = (
  studentId?: string,
  startDate?: Date,
  endDate?: Date
) => {
  return useQuery({
    queryKey: ['student-schedule', studentId, startDate, endDate],
    queryFn: async () => {
      if (!studentId) return [];

      const start = startDate || startOfMonth(new Date());
      const end = endDate || endOfMonth(new Date());

      // Получаем группы студента
      const { data: studentGroups } = await (supabase
        .from('group_students' as any) as any)
        .select('group_id')
        .eq('student_id', studentId)
        .eq('status', 'active');

      const groupIds = studentGroups?.map((sg: any) => sg.group_id) || [];

      let groupLessons: any[] = [];
      if (groupIds.length > 0) {
        // Получаем групповые занятия
        const { data, error: groupError } = await (supabase
          .from('lesson_sessions' as any) as any)
          .select(`
            id,
            lesson_date,
            status,
            notes,
            classroom,
            learning_groups (
              id,
              name,
              subject,
              level,
              branch,
              schedule_time,
              duration,
              teacher_id,
              profiles (
                first_name,
                last_name
              )
            ),
            student_attendance (
              status,
              notes
            )
          `)
          .gte('lesson_date', format(start, 'yyyy-MM-dd'))
          .lte('lesson_date', format(end, 'yyyy-MM-dd'))
          .in('group_id', groupIds);

        if (groupError) throw groupError;
        groupLessons = data || [];
      }

      // Получаем индивидуальные уроки студента
      const { data: studentLessons } = await (supabase
        .from('individual_lessons' as any) as any)
        .select('id')
        .eq('student_id', studentId);

      const lessonIds = studentLessons?.map((sl: any) => sl.id) || [];

      let individualLessons: any[] = [];
      if (lessonIds.length > 0) {
        // Получаем индивидуальные занятия
        const { data, error: individualError } = await (supabase
          .from('individual_lesson_sessions' as any) as any)
          .select(`
            id,
            lesson_date,
            status,
            notes,
            duration,
            individual_lessons (
              id,
              subject,
              level,
              branch,
              schedule_time,
              teacher_id,
              student_name,
              profiles (
                first_name,
                last_name
              )
            )
          `)
          .gte('lesson_date', format(start, 'yyyy-MM-dd'))
          .lte('lesson_date', format(end, 'yyyy-MM-dd'))
          .in('individual_lesson_id', lessonIds);

        if (individualError) throw individualError;
        individualLessons = data || [];
      }

      // Форматируем данные
      const formattedGroupLessons: StudentLesson[] =
        (groupLessons || []).map((lesson: any) => ({
          id: lesson.id,
          lesson_date: lesson.lesson_date,
          lesson_time: lesson.learning_groups?.schedule_time,
          lesson_type: 'group' as const,
          subject: lesson.learning_groups?.subject || '',
          level: lesson.learning_groups?.level,
          branch: lesson.learning_groups?.branch || '',
          teacher_name: lesson.learning_groups?.profiles
            ? `${lesson.learning_groups.profiles.first_name} ${lesson.learning_groups.profiles.last_name}`
            : undefined,
          teacher_id: lesson.learning_groups?.teacher_id,
          group_name: lesson.learning_groups?.name,
          status: lesson.status,
          duration: lesson.learning_groups?.duration,
          notes: lesson.notes,
          classroom: lesson.classroom,
          attendance_status: lesson.student_attendance?.[0]?.status,
        }));

      const formattedIndividualLessons: StudentLesson[] =
        (individualLessons || []).map((lesson: any) => ({
          id: lesson.id,
          lesson_date: lesson.lesson_date,
          lesson_time: lesson.individual_lessons?.schedule_time,
          lesson_type: 'individual' as const,
          subject: lesson.individual_lessons?.subject || '',
          level: lesson.individual_lessons?.level,
          branch: lesson.individual_lessons?.branch || '',
          teacher_name: lesson.individual_lessons?.profiles
            ? `${lesson.individual_lessons.profiles.first_name} ${lesson.individual_lessons.profiles.last_name}`
            : undefined,
          teacher_id: lesson.individual_lessons?.teacher_id,
          status: lesson.status,
          duration: lesson.duration || lesson.individual_lessons?.duration,
          notes: lesson.notes,
        }));

      // Объединяем и сортируем
      return [...formattedGroupLessons, ...formattedIndividualLessons].sort(
        (a, b) => {
          const dateCompare = a.lesson_date.localeCompare(b.lesson_date);
          if (dateCompare !== 0) return dateCompare;
          
          const timeA = a.lesson_time || '';
          const timeB = b.lesson_time || '';
          return timeA.localeCompare(timeB);
        }
      );
    },
    enabled: !!studentId,
  });
};
