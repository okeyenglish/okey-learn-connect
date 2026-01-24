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

export const useSchoolCalendar = (startDate?: Date, endDate?: Date, branch?: string) => {
  return useQuery({
    queryKey: ['school-calendar', startDate, endDate, branch],
    queryFn: async () => {
      if (!startDate || !endDate) return [];

      const start = format(startDate, 'yyyy-MM-dd');
      const end = format(endDate, 'yyyy-MM-dd');

      // Получаем все групповые занятия
      const groupQuery = (supabase
        .from('lesson_sessions' as any) as any)
        .select(`
          id,
          lesson_date,
          status,
          classroom,
          group_id
        `)
        .gte('lesson_date', start)
        .lte('lesson_date', end);

      const { data: groupSessions } = await groupQuery;

      // Получаем данные групп
      const groupIds = groupSessions?.map((s: any) => s.group_id) || [];
      let groupsData: any[] = [];
      
      if (groupIds.length > 0) {
        const { data } = await (supabase
          .from('learning_groups' as any) as any)
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
        
        groupsData = data || [];
      }

      // Получаем индивидуальные занятия
      const individualQuery = (supabase
        .from('individual_lesson_sessions' as any) as any)
        .select(`
          id,
          lesson_date,
          status,
          duration,
          individual_lesson_id
        `)
        .gte('lesson_date', start)
        .lte('lesson_date', end);

      const { data: individualSessions } = await individualQuery;

      // Получаем данные индивидуальных уроков
      const lessonIds = individualSessions?.map((s: any) => s.individual_lesson_id) || [];
      let lessonsData: any[] = [];
      
      if (lessonIds.length > 0) {
        const { data } = await (supabase
          .from('individual_lessons' as any) as any)
          .select(`
            id,
            subject,
            level,
            branch,
            schedule_time,
            teacher_id,
            student_name,
            profiles (first_name, last_name)
          `)
          .in('id', lessonIds);
        
        lessonsData = data || [];
      }

      // Форматируем групповые занятия
      const groupLessons: SchoolLesson[] = (groupSessions || []).map((session: any) => {
        const group = groupsData.find((g: any) => g.id === session.group_id);
        return {
          id: session.id,
          lesson_date: session.lesson_date,
          lesson_time: group?.schedule_time,
          lesson_type: 'group' as const,
          subject: group?.subject || '',
          level: group?.level,
          branch: group?.branch || '',
          teacher_id: group?.teacher_id,
          teacher_name: group?.profiles
            ? `${group.profiles.first_name} ${group.profiles.last_name}`
            : undefined,
          group_name: group?.name,
          classroom: session.classroom,
          status: session.status,
          duration: group?.duration,
        };
      });

      // Форматируем индивидуальные занятия
      const individualLessons: SchoolLesson[] = (individualSessions || []).map((session: any) => {
        const lesson = lessonsData.find((l: any) => l.id === session.individual_lesson_id);
        return {
          id: session.id,
          lesson_date: session.lesson_date,
          lesson_time: lesson?.schedule_time,
          lesson_type: 'individual' as const,
          subject: lesson?.subject || '',
          level: lesson?.level,
          branch: lesson?.branch || '',
          teacher_id: lesson?.teacher_id,
          teacher_name: lesson?.profiles
            ? `${lesson.profiles.first_name} ${lesson.profiles.last_name}`
            : undefined,
          student_name: lesson?.student_name,
          status: session.status,
          duration: session.duration || lesson?.duration,
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
      const { data: classrooms } = await (supabase
        .from('classrooms' as any) as any)
        .select('name, branch, capacity')
        .eq('branch', branch)
        .eq('is_active', true);

      if (!classrooms || classrooms.length === 0) return [];

      // Получаем занятия за день (дублируем логику из useSchoolCalendar)
      const start = format(new Date(date), 'yyyy-MM-dd');
      const end = start;

      const groupQuery = (supabase
        .from('lesson_sessions' as any) as any)
        .select(`
          id,
          lesson_date,
          status,
          classroom,
          group_id
        `)
        .gte('lesson_date', start)
        .lte('lesson_date', end);

      const { data: groupSessions } = await groupQuery;
      const groupIds = groupSessions?.map((s: any) => s.group_id) || [];
      let groupsData: any[] = [];
      
      if (groupIds.length > 0) {
        const { data } = await (supabase
          .from('learning_groups' as any) as any)
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
        
        groupsData = data || [];
      }

      const individualQuery = (supabase
        .from('individual_lesson_sessions' as any) as any)
        .select(`
          id,
          lesson_date,
          status,
          duration,
          individual_lesson_id
        `)
        .gte('lesson_date', start)
        .lte('lesson_date', end);

      const { data: individualSessions } = await individualQuery;
      const lessonIds = individualSessions?.map((s: any) => s.individual_lesson_id) || [];
      let lessonsData: any[] = [];
      
      if (lessonIds.length > 0) {
        const { data } = await (supabase
          .from('individual_lessons' as any) as any)
          .select(`
            id,
            subject,
            level,
            branch,
            schedule_time,
            teacher_id,
            student_name,
            profiles (first_name, last_name)
          `)
          .in('id', lessonIds);
        
        lessonsData = data || [];
      }

      const groupLessons: SchoolLesson[] = (groupSessions || []).map((session: any) => {
        const group = groupsData.find((g: any) => g.id === session.group_id);
        return {
          id: session.id,
          lesson_date: session.lesson_date,
          lesson_time: group?.schedule_time,
          lesson_type: 'group' as const,
          subject: group?.subject || '',
          level: group?.level,
          branch: group?.branch || '',
          teacher_id: group?.teacher_id,
          teacher_name: group?.profiles
            ? `${group.profiles.first_name} ${group.profiles.last_name}`
            : undefined,
          group_name: group?.name,
          classroom: session.classroom,
          status: session.status,
          duration: group?.duration,
        };
      });

      const individualLessons: SchoolLesson[] = (individualSessions || []).map((session: any) => {
        const lesson = lessonsData.find((l: any) => l.id === session.individual_lesson_id);
        return {
          id: session.id,
          lesson_date: session.lesson_date,
          lesson_time: lesson?.schedule_time,
          lesson_type: 'individual' as const,
          subject: lesson?.subject || '',
          level: lesson?.level,
          branch: lesson?.branch || '',
          teacher_id: lesson?.teacher_id,
          teacher_name: lesson?.profiles
            ? `${lesson.profiles.first_name} ${lesson.profiles.last_name}`
            : undefined,
          student_name: lesson?.student_name,
          status: session.status,
          duration: session.duration || lesson?.duration,
        };
      });

      let allLessons = [...groupLessons, ...individualLessons].filter(
        (l) => l.branch === branch
      );

      // Группируем по кабинетам
      const scheduleByClassroom: ClassroomSchedule[] = classrooms.map((classroom: any) => {
        const classroomLessons = allLessons.filter(
          (l: SchoolLesson) => l.classroom === classroom.name
        );

        const totalMinutes = classroomLessons.reduce(
          (sum: number, l: SchoolLesson) => sum + (l.duration || 0),
          0
        );

        return {
          classroom: classroom.name,
          branch: classroom.branch,
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
