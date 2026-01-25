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

interface GroupStudentRow {
  group_id: string;
}

interface LessonSessionRow {
  id: string;
  lesson_date: string;
  status: string;
  notes: string | null;
  classroom: string | null;
  learning_groups: {
    id: string;
    name: string;
    subject: string | null;
    level: string | null;
    branch: string | null;
    schedule_time: string | null;
    duration: number | null;
    teacher_id: string | null;
    profiles: {
      first_name: string | null;
      last_name: string | null;
    } | null;
  } | null;
  student_attendance: Array<{
    status: string;
    notes: string | null;
  }>;
}

interface IndividualLessonRow {
  id: string;
}

interface IndividualSessionRow {
  id: string;
  lesson_date: string;
  status: string;
  notes: string | null;
  duration: number | null;
  individual_lessons: {
    id: string;
    subject: string | null;
    level: string | null;
    branch: string | null;
    schedule_time: string | null;
    teacher_id: string | null;
    student_name: string | null;
    profiles: {
      first_name: string | null;
      last_name: string | null;
    } | null;
  } | null;
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
      const { data: studentGroups } = await supabase
        .from('group_students')
        .select('group_id')
        .eq('student_id', studentId)
        .eq('status', 'active');

      const groupRows = (studentGroups || []) as GroupStudentRow[];
      const groupIds = groupRows.map((sg) => sg.group_id);

      let groupLessons: LessonSessionRow[] = [];
      if (groupIds.length > 0) {
        // Получаем групповые занятия
        const { data, error: groupError } = await supabase
          .from('lesson_sessions')
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
        groupLessons = (data || []) as unknown as LessonSessionRow[];
      }

      // Получаем индивидуальные уроки студента
      const { data: studentLessons } = await supabase
        .from('individual_lessons')
        .select('id')
        .eq('student_id', studentId);

      const lessonRows = (studentLessons || []) as IndividualLessonRow[];
      const lessonIds = lessonRows.map((sl) => sl.id);

      let individualLessons: IndividualSessionRow[] = [];
      if (lessonIds.length > 0) {
        // Получаем индивидуальные занятия
        const { data, error: individualError } = await supabase
          .from('individual_lesson_sessions')
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
        individualLessons = (data || []) as unknown as IndividualSessionRow[];
      }

      // Форматируем данные
      const formattedGroupLessons: StudentLesson[] =
        groupLessons.map((lesson) => ({
          id: lesson.id,
          lesson_date: lesson.lesson_date,
          lesson_time: lesson.learning_groups?.schedule_time || undefined,
          lesson_type: 'group' as const,
          subject: lesson.learning_groups?.subject || '',
          level: lesson.learning_groups?.level || undefined,
          branch: lesson.learning_groups?.branch || '',
          teacher_name: lesson.learning_groups?.profiles
            ? `${lesson.learning_groups.profiles.first_name} ${lesson.learning_groups.profiles.last_name}`
            : undefined,
          teacher_id: lesson.learning_groups?.teacher_id || undefined,
          group_name: lesson.learning_groups?.name,
          status: lesson.status,
          duration: lesson.learning_groups?.duration || undefined,
          notes: lesson.notes || undefined,
          classroom: lesson.classroom || undefined,
          attendance_status: lesson.student_attendance?.[0]?.status,
        }));

      const formattedIndividualLessons: StudentLesson[] =
        individualLessons.map((lesson) => ({
          id: lesson.id,
          lesson_date: lesson.lesson_date,
          lesson_time: lesson.individual_lessons?.schedule_time || undefined,
          lesson_type: 'individual' as const,
          subject: lesson.individual_lessons?.subject || '',
          level: lesson.individual_lessons?.level || undefined,
          branch: lesson.individual_lessons?.branch || '',
          teacher_name: lesson.individual_lessons?.profiles
            ? `${lesson.individual_lessons.profiles.first_name} ${lesson.individual_lessons.profiles.last_name}`
            : undefined,
          teacher_id: lesson.individual_lessons?.teacher_id || undefined,
          status: lesson.status,
          duration: lesson.duration || undefined,
          notes: lesson.notes || undefined,
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
