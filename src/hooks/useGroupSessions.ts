import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GroupSession {
  id: string;
  lesson_date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'cancelled' | 'completed' | 'rescheduled';
  classroom: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface HomeworkItem {
  id: string;
  student_name: string;
  lesson_date: string;
  assignment: string;
  is_completed: boolean;
  comments?: string;
}

export interface TeacherPayment {
  id: string;
  teacher_name: string;
  group_id: string;
  lesson_date: string;
  amount: number;
  status: 'pending' | 'paid';
  academic_hours: number;
}

// Hook для получения всех занятий группы
export const useGroupSessions = (groupId: string) => {
  return useQuery({
    queryKey: ['group_sessions', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_sessions')
        .select(`
          id,
          lesson_date,
          start_time,
          end_time,
          status,
          classroom,
          notes,
          created_at,
          updated_at
        `)
        .eq('group_id', groupId)
        .order('lesson_date', { ascending: false });

      if (error) throw error;
      return data as GroupSession[];
    },
    enabled: !!groupId,
  });
};

// Hook для получения студентов группы
export const useGroupStudents = (groupId: string) => {
  return useQuery({
    queryKey: ['group_students', groupId],
    queryFn: async () => {
      // Сначала получаем все lesson_session_id для данной группы
      const { data: sessionIds, error: sessionError } = await supabase
        .from('lesson_sessions')
        .select('id')
        .eq('group_id', groupId);

      if (sessionError) throw sessionError;
      
      if (!sessionIds || sessionIds.length === 0) {
        return [];
      }

      // Затем получаем студентов по этим session_id
      const { data, error } = await supabase
        .from('student_lesson_sessions')
        .select(`
          students!student_lesson_sessions_student_id_fkey (
            id,
            name,
            first_name,
            last_name,
            age,
            status
          )
        `)
        .in('lesson_session_id', sessionIds.map(s => s.id));

      if (error) throw error;
      
      // Убираем дубликаты студентов
      const uniqueStudents = data?.reduce((acc: any[], item: any) => {
        const student = item.students;
        if (student && !acc.find(s => s.id === student.id)) {
          acc.push(student);
        }
        return acc;
      }, []);

      return uniqueStudents || [];
    },
    enabled: !!groupId,
  });
};

// Mock данные для домашних заданий (пока нет таблицы в БД)
export const useGroupHomework = (groupId: string) => {
  return useQuery({
    queryKey: ['group_homework', groupId],
    queryFn: async () => {
      // Временные моковые данные
      const mockHomework: HomeworkItem[] = [
        {
          id: '1',
          student_name: 'Tchuente Dany',
          lesson_date: '2025-09-10',
          assignment: 'Audio HW',
          is_completed: true,
          comments: 'Выполнено хорошо'
        },
        {
          id: '2', 
          student_name: 'Tchuente Dany',
          lesson_date: '2025-09-05',
          assignment: 'Audio HW', 
          is_completed: true,
          comments: 'Отлично'
        },
        {
          id: '3',
          student_name: 'Tchuente Dany', 
          lesson_date: '2025-09-03',
          assignment: 'Workbook page 16',
          is_completed: true,
          comments: 'Выполнено'
        },
        {
          id: '4',
          student_name: 'Tchuente Dany',
          lesson_date: '2025-08-20', 
          assignment: 'Weekend HW',
          is_completed: true,
          comments: 'Хорошо'
        },
        {
          id: '5',
          student_name: 'Tchuente Dany',
          lesson_date: '2025-08-18',
          assignment: 'UNIT 2 – REVISION EXERCISE', 
          is_completed: true,
          comments: 'Отлично выполнено'
        }
      ];
      
      return mockHomework;
    },
    enabled: !!groupId,
  });
};

// Mock данные для оплат преподавателя (пока нет таблицы в БД) 
export const useTeacherPayments = (groupId: string, teacherName: string) => {
  return useQuery({
    queryKey: ['teacher_payments', groupId, teacherName],
    queryFn: async () => {
      // Временные моковые данные
      const mockPayments: TeacherPayment[] = [
        {
          id: '1', 
          teacher_name: teacherName,
          group_id: groupId,
          lesson_date: '2025-08-27',
          amount: 34.5,
          status: 'pending',
          academic_hours: 15525
        }
      ];
      
      return mockPayments;
    },
    enabled: !!groupId && !!teacherName,
  });
};