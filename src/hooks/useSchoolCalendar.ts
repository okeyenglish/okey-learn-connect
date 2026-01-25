import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { format } from 'date-fns';

export interface SchoolLesson {
  id: string;
  lesson_date: string;
  lesson_time?: string;
  lesson_type: 'group' | 'individual';
  subject: string;
  level?: string;
  branch: string;
  teacher_id?: string;
  teacher_name?: string;
  group_name?: string;
  student_name?: string;
  classroom?: string;
  status: string;
  duration?: number;
  students_count?: number;
}

export interface ClassroomSchedule {
  classroom: string;
  branch: string;
  lessons: SchoolLesson[];
  utilization_percent: number;
}

export interface BranchStats {
  branch: string;
  total_lessons: number;
  total_hours: number;
  classrooms_count: number;
  teachers_count: number;
  students_count: number;
}

interface GroupSession {
  id: string;
  lesson_date: string;
  status: string | null;
  classroom: string | null;
  group_id: string | null;
}

interface GroupData {
  id: string;
  name: string;
  subject: string | null;
  level: string | null;
  branch: string | null;
  schedule_time: string | null;
  duration: number | null;
  teacher_id: string | null;
  profiles: { first_name: string | null; last_name: string | null } | null;
}

interface IndividualSession {
  id: string;
  lesson_date: string;
  status: string | null;
  duration: number | null;
  individual_lesson_id: string | null;
}

interface IndividualLessonData {
  id: string;
  subject: string | null;
  level: string | null;
  branch: string | null;
  schedule_time: string | null;
  teacher_id: string | null;
  student_name: string | null;
  duration: number | null;
  profiles: { first_name: string | null; last_name: string | null } | null;
}

interface ClassroomData {
  name: string;
  branch: string | null;
  capacity: number | null;
}

export const useSchoolCalendar = (startDate?: Date, endDate?: Date, branch?: string) => {
  return useQuery({
    queryKey: ['school-calendar', startDate, endDate, branch],
    queryFn: async () => {
      if (!startDate || !endDate) return [];

      const start = format(startDate, 'yyyy-MM-dd');
      const end = format(endDate, 'yyyy-MM-dd');

      // Получаем все групповые занятия
      const { data: groupSessions } = await supabase
        .from('lesson_sessions')
        .select(`
          id,
          lesson_date,
          status,
          classroom,
          group_id
        `)
        .gte('lesson_date', start)
        .lte('lesson_date', end);

      // Получаем данные групп
      const groupIds = (groupSessions as GroupSession[] || []).map(s => s.group_id).filter(Boolean) as string[];
      let groupsData: GroupData[] = [];
      
      if (groupIds.length > 0) {
        const { data } = await supabase
          .from('learning_groups')
          .select(`
            id,
            name,
            subject,
            level,
            branch,
            schedule_time,
            duration,
            teacher_id,
            profiles (first_name, last_name)
          `)
          .in('id', groupIds);
        
        groupsData = (data || []) as unknown as GroupData[];
      }

      // Получаем индивидуальные занятия
      const { data: individualSessions } = await supabase
        .from('individual_lesson_sessions')
        .select(`
          id,
          lesson_date,
          status,
          duration,
          individual_lesson_id
        `)
        .gte('lesson_date', start)
        .lte('lesson_date', end);

      // Получаем данные индивидуальных уроков
      const lessonIds = (individualSessions as IndividualSession[] || []).map(s => s.individual_lesson_id).filter(Boolean) as string[];
      let lessonsData: IndividualLessonData[] = [];
      
      if (lessonIds.length > 0) {
        const { data } = await supabase
          .from('individual_lessons')
          .select(`
            id,
            subject,
            level,
            branch,
            schedule_time,
            teacher_id,
            student_name,
            duration,
            profiles (first_name, last_name)
          `)
          .in('id', lessonIds);
        
        lessonsData = (data || []) as unknown as IndividualLessonData[];
      }

      // Форматируем групповые занятия
      const groupLessons: SchoolLesson[] = ((groupSessions as GroupSession[]) || []).map((session) => {
        const group = groupsData.find((g) => g.id === session.group_id);
        return {
          id: session.id,
          lesson_date: session.lesson_date,
          lesson_time: group?.schedule_time ?? undefined,
          lesson_type: 'group' as const,
          subject: group?.subject || '',
          level: group?.level ?? undefined,
          branch: group?.branch || '',
          teacher_id: group?.teacher_id ?? undefined,
          teacher_name: group?.profiles
            ? `${group.profiles.first_name} ${group.profiles.last_name}`
            : undefined,
          group_name: group?.name,
          classroom: session.classroom ?? undefined,
          status: session.status || '',
          duration: group?.duration ?? undefined,
        };
      });

      // Форматируем индивидуальные занятия
      const individualLessons: SchoolLesson[] = ((individualSessions as IndividualSession[]) || []).map((session) => {
        const lesson = lessonsData.find((l) => l.id === session.individual_lesson_id);
        return {
          id: session.id,
          lesson_date: session.lesson_date,
          lesson_time: lesson?.schedule_time ?? undefined,
          lesson_type: 'individual' as const,
          subject: lesson?.subject || '',
          level: lesson?.level ?? undefined,
          branch: lesson?.branch || '',
          teacher_id: lesson?.teacher_id ?? undefined,
          teacher_name: lesson?.profiles
            ? `${lesson.profiles.first_name} ${lesson.profiles.last_name}`
            : undefined,
          student_name: lesson?.student_name ?? undefined,
          status: session.status || '',
          duration: session.duration || lesson?.duration || undefined,
        };
      });

      // Объединяем и фильтруем по филиалу
      let allLessons = [...groupLessons, ...individualLessons];
      
      if (branch && branch !== 'all') {
        allLessons = allLessons.filter((l) => l.branch === branch);
      }

      // Сортируем
      return allLessons.sort((a, b) => {
        const dateCompare = a.lesson_date.localeCompare(b.lesson_date);
        if (dateCompare !== 0) return dateCompare;
        
        const timeA = a.lesson_time || '';
        const timeB = b.lesson_time || '';
        return timeA.localeCompare(timeB);
      });
    },
    enabled: !!startDate && !!endDate,
  });
};

export const useClassroomSchedule = (branch?: string, date?: string) => {
  return useQuery({
    queryKey: ['classroom-schedule', branch, date],
    queryFn: async () => {
      if (!branch || !date || branch === 'all') return [];

      // Получаем список кабинетов филиала
      const { data: classrooms } = await supabase
        .from('classrooms')
        .select('name, branch, capacity')
        .eq('branch', branch)
        .eq('is_active', true);

      if (!classrooms || classrooms.length === 0) return [];

      // Получаем занятия за день
      const start = format(new Date(date), 'yyyy-MM-dd');

      const { data: groupSessions } = await supabase
        .from('lesson_sessions')
        .select(`
          id,
          lesson_date,
          status,
          classroom,
          group_id
        `)
        .gte('lesson_date', start)
        .lte('lesson_date', start);

      const groupIds = (groupSessions as GroupSession[] || []).map(s => s.group_id).filter(Boolean) as string[];
      let groupsData: GroupData[] = [];
      
      if (groupIds.length > 0) {
        const { data } = await supabase
          .from('learning_groups')
          .select(`
            id,
            name,
            subject,
            level,
            branch,
            schedule_time,
            duration,
            teacher_id,
            profiles (first_name, last_name)
          `)
          .in('id', groupIds);
        
        groupsData = (data || []) as unknown as GroupData[];
      }

      const { data: individualSessions } = await supabase
        .from('individual_lesson_sessions')
        .select(`
          id,
          lesson_date,
          status,
          duration,
          individual_lesson_id
        `)
        .gte('lesson_date', start)
        .lte('lesson_date', start);

      const lessonIds = (individualSessions as IndividualSession[] || []).map(s => s.individual_lesson_id).filter(Boolean) as string[];
      let lessonsData: IndividualLessonData[] = [];
      
      if (lessonIds.length > 0) {
        const { data } = await supabase
          .from('individual_lessons')
          .select(`
            id,
            subject,
            level,
            branch,
            schedule_time,
            teacher_id,
            student_name,
            duration,
            profiles (first_name, last_name)
          `)
          .in('id', lessonIds);
        
        lessonsData = (data || []) as unknown as IndividualLessonData[];
      }

      const groupLessons: SchoolLesson[] = ((groupSessions as GroupSession[]) || []).map((session) => {
        const group = groupsData.find((g) => g.id === session.group_id);
        return {
          id: session.id,
          lesson_date: session.lesson_date,
          lesson_time: group?.schedule_time ?? undefined,
          lesson_type: 'group' as const,
          subject: group?.subject || '',
          level: group?.level ?? undefined,
          branch: group?.branch || '',
          teacher_id: group?.teacher_id ?? undefined,
          teacher_name: group?.profiles
            ? `${group.profiles.first_name} ${group.profiles.last_name}`
            : undefined,
          group_name: group?.name,
          classroom: session.classroom ?? undefined,
          status: session.status || '',
          duration: group?.duration ?? undefined,
        };
      });

      const individualLessons: SchoolLesson[] = ((individualSessions as IndividualSession[]) || []).map((session) => {
        const lesson = lessonsData.find((l) => l.id === session.individual_lesson_id);
        return {
          id: session.id,
          lesson_date: session.lesson_date,
          lesson_time: lesson?.schedule_time ?? undefined,
          lesson_type: 'individual' as const,
          subject: lesson?.subject || '',
          level: lesson?.level ?? undefined,
          branch: lesson?.branch || '',
          teacher_id: lesson?.teacher_id ?? undefined,
          teacher_name: lesson?.profiles
            ? `${lesson.profiles.first_name} ${lesson.profiles.last_name}`
            : undefined,
          student_name: lesson?.student_name ?? undefined,
          status: session.status || '',
          duration: session.duration || lesson?.duration || undefined,
        };
      });

      const allLessons = [...groupLessons, ...individualLessons].filter(
        (l) => l.branch === branch
      );

      // Группируем по кабинетам
      const scheduleByClassroom: ClassroomSchedule[] = (classrooms as ClassroomData[]).map((classroom) => {
        const classroomLessons = allLessons.filter(
          (l) => l.classroom === classroom.name
        );

        const totalMinutes = classroomLessons.reduce(
          (sum, l) => sum + (l.duration || 0),
          0
        );

        return {
          classroom: classroom.name,
          branch: classroom.branch || '',
          lessons: classroomLessons,
          utilization_percent: Math.round((totalMinutes / (12 * 60)) * 100),
        };
      });

      return scheduleByClassroom;
    },
    enabled: !!branch && !!date && branch !== 'all',
  });
};

export const useBranchStats = (startDate?: Date, endDate?: Date) => {
  const { data: lessons = [] } = useSchoolCalendar(startDate, endDate);

  if (!startDate || !endDate || !lessons.length) {
    return { data: [] };
  }

  // Группируем по филиалам
  const branches = Array.from(new Set(lessons.map((l) => l.branch)));

  const stats: BranchStats[] = branches.map((branch) => {
    const branchLessons = lessons.filter((l) => l.branch === branch);

    const teacherIds = Array.from(
      new Set(branchLessons.map((l) => l.teacher_id).filter(Boolean))
    );

    return {
      branch,
      total_lessons: branchLessons.length,
      total_hours: branchLessons.reduce((sum, l) => sum + ((l.duration || 0) / 60), 0),
      classrooms_count: 0,
      teachers_count: teacherIds.length,
      students_count: 0,
    };
  });

  return { data: stats };
};
