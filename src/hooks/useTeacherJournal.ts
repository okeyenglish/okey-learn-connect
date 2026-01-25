import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';

export interface JournalGroup {
  id: string;
  name: string;
  level: string;
  branch: string;
  subject: string;
  students_count: number;
  recent_sessions: {
    id: string;
    lesson_date: string;
    start_time: string;
    status: string;
  }[];
}

export interface JournalIndividualLesson {
  id: string;
  student_name: string;
  subject: string;
  branch: string;
  duration: number;
  schedule_days: string[];
  schedule_time: string;
  recent_sessions: {
    id: string;
    lesson_date: string;
    status: string;
    duration: number;
  }[];
}

export const useTeacherGroups = (teacherName: string) => {
  return useQuery({
    queryKey: ['teacher-journal-groups', teacherName],
    queryFn: async () => {
      const { data: groups, error } = await (supabase
        .from('learning_groups' as any) as any)
        .select(`
          id,
          name,
          level,
          branch,
          subject,
          group_students (count)
        `)
        .eq('responsible_teacher', teacherName)
        .eq('is_active', true);

      if (error) throw error;

      // Для каждой группы получаем последние занятия
      const groupsWithSessions = await Promise.all(
        (groups || []).map(async (group: any) => {
          const { data: sessions } = await (supabase
            .from('lesson_sessions' as any) as any)
            .select('id, lesson_date, start_time, status')
            .eq('group_id', group.id)
            .order('lesson_date', { ascending: false })
            .limit(5);

          return {
            id: group.id,
            name: group.name,
            level: group.level,
            branch: group.branch,
            subject: group.subject,
            students_count: group.group_students?.[0]?.count || 0,
            recent_sessions: sessions || [],
          };
        })
      );

      return groupsWithSessions as JournalGroup[];
    },
    enabled: !!teacherName,
  });
};

export const useTeacherIndividualLessons = (teacherName: string) => {
  return useQuery({
    queryKey: ['teacher-journal-individual', teacherName],
    queryFn: async () => {
      const { data: lessons, error } = await (supabase
        .from('individual_lessons' as any) as any)
        .select(`
          id,
          student_name,
          subject,
          branch,
          duration,
          schedule_days,
          schedule_time,
          is_active
        `)
        .eq('teacher_name', teacherName)
        .eq('is_active', true);

      if (error) throw error;

      // Для каждого урока получаем последние сессии
      const lessonsWithSessions = await Promise.all(
        (lessons || []).map(async (lesson: any) => {
          const { data: sessions } = await (supabase
            .from('individual_lesson_sessions' as any) as any)
            .select('id, lesson_date, status, duration')
            .eq('individual_lesson_id', lesson.id)
            .order('lesson_date', { ascending: false })
            .limit(5);

          return {
            id: lesson.id,
            student_name: lesson.student_name,
            subject: lesson.subject,
            branch: lesson.branch,
            duration: lesson.duration,
            schedule_days: lesson.schedule_days || [],
            schedule_time: lesson.schedule_time,
            recent_sessions: sessions || [],
          };
        })
      );

      return lessonsWithSessions as JournalIndividualLesson[];
    },
    enabled: !!teacherName,
  });
};

export const useGroupStudentsAttendance = (groupId: string, sessionId?: string) => {
  return useQuery({
    queryKey: ['group-students-attendance', groupId, sessionId],
    queryFn: async () => {
      const { data: students, error } = await (supabase
        .from('group_students' as any) as any)
        .select(`
          id,
          status,
          students (
            id,
            name,
            first_name,
            last_name
          )
        `)
        .eq('group_id', groupId)
        .eq('status', 'active');

      if (error) throw error;

      // Если указана сессия, получаем посещаемость для неё
      if (sessionId) {
        const { data: attendance } = await (supabase
          .from('student_lesson_sessions' as any) as any)
          .select('student_id, attendance_status, notes')
          .eq('lesson_session_id', sessionId);

        const attendanceMap = new Map(
          (attendance || []).map((a: any) => [a.student_id, a])
        );

        return (students || []).map((gs: any) => ({
          ...gs.students,
          group_student_id: gs.id,
          attendance_status: (attendanceMap.get(gs.students?.id) as any)?.attendance_status || 'not_marked',
          attendance_notes: (attendanceMap.get(gs.students?.id) as any)?.notes,
        }));
      }

      return (students || []).map((gs: any) => ({
        ...gs.students,
        group_student_id: gs.id,
      }));
    },
    enabled: !!groupId,
  });
};
