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

interface GroupQueryResult {
  id: string;
  name: string;
  level: string | null;
  branch: string | null;
  subject: string | null;
  group_students: { count: number }[] | null;
}

interface SessionResult {
  id: string;
  lesson_date: string;
  start_time: string | null;
  status: string | null;
}

interface IndividualLessonResult {
  id: string;
  student_name: string | null;
  subject: string | null;
  branch: string | null;
  duration: number | null;
  schedule_days: string[] | null;
  schedule_time: string | null;
  is_active: boolean;
}

interface IndividualSessionResult {
  id: string;
  lesson_date: string;
  status: string | null;
  duration: number | null;
}

interface GroupStudentResult {
  id: string;
  status: string;
  students: {
    id: string;
    name: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface AttendanceResult {
  student_id: string;
  attendance_status: string | null;
  notes: string | null;
}

export const useTeacherGroups = (teacherName: string) => {
  return useQuery({
    queryKey: ['teacher-journal-groups', teacherName],
    queryFn: async () => {
      const { data: groups, error } = await supabase
        .from('learning_groups')
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
        ((groups as GroupQueryResult[]) || []).map(async (group) => {
          const { data: sessions } = await supabase
            .from('lesson_sessions')
            .select('id, lesson_date, start_time, status')
            .eq('group_id', group.id)
            .order('lesson_date', { ascending: false })
            .limit(5);

          return {
            id: group.id,
            name: group.name,
            level: group.level || '',
            branch: group.branch || '',
            subject: group.subject || '',
            students_count: group.group_students?.[0]?.count || 0,
            recent_sessions: ((sessions as SessionResult[]) || []).map(s => ({
              id: s.id,
              lesson_date: s.lesson_date,
              start_time: s.start_time || '',
              status: s.status || '',
            })),
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
      const { data: lessons, error } = await supabase
        .from('individual_lessons')
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
        ((lessons as IndividualLessonResult[]) || []).map(async (lesson) => {
          const { data: sessions } = await supabase
            .from('individual_lesson_sessions')
            .select('id, lesson_date, status, duration')
            .eq('individual_lesson_id', lesson.id)
            .order('lesson_date', { ascending: false })
            .limit(5);

          return {
            id: lesson.id,
            student_name: lesson.student_name || '',
            subject: lesson.subject || '',
            branch: lesson.branch || '',
            duration: lesson.duration || 0,
            schedule_days: lesson.schedule_days || [],
            schedule_time: lesson.schedule_time || '',
            recent_sessions: ((sessions as IndividualSessionResult[]) || []).map(s => ({
              id: s.id,
              lesson_date: s.lesson_date,
              status: s.status || '',
              duration: s.duration || 0,
            })),
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
      const { data: students, error } = await supabase
        .from('group_students')
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

      const typedStudents = (students || []) as unknown as GroupStudentResult[];

      // Если указана сессия, получаем посещаемость для неё
      if (sessionId) {
        const { data: attendance } = await supabase
          .from('student_lesson_sessions')
          .select('student_id, attendance_status, notes')
          .eq('lesson_session_id', sessionId);

        const typedAttendance = (attendance || []) as AttendanceResult[];
        const attendanceMap = new Map(
          typedAttendance.map((a) => [a.student_id, a])
        );

        return typedStudents.map((gs) => ({
          ...gs.students,
          group_student_id: gs.id,
          attendance_status: attendanceMap.get(gs.students?.id || '')?.attendance_status || 'not_marked',
          attendance_notes: attendanceMap.get(gs.students?.id || '')?.notes,
        }));
      }

      return typedStudents.map((gs) => ({
        ...gs.students,
        group_student_id: gs.id,
      }));
    },
    enabled: !!groupId,
  });
};
