import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/typedClient";
import { Student } from "./useStudents";

export interface StudentConflict {
  conflict_session_id: string;
  conflicting_group_name: string;
  conflicting_teacher: string;
  conflicting_classroom: string;
  conflicting_branch: string;
  conflicting_time_range: string;
  lesson_type: 'group' | 'individual';
}

export interface StudentConflictResult {
  student_id: string;
  has_conflict: boolean;
  conflict_details: StudentConflict[];
}

// Hook to check conflicts for a single student
export const useCheckStudentConflict = () => {
  return useMutation({
    mutationFn: async ({
      studentId,
      lessonDate,
      startTime,
      endTime,
      excludeSessionId
    }: {
      studentId: string;
      lessonDate: string;
      startTime: string;
      endTime: string;
      excludeSessionId?: string;
    }) => {
      const { data, error } = await supabase.rpc('check_student_conflict', {
        p_student_id: studentId,
        p_lesson_date: lessonDate,
        p_start_time: startTime,
        p_end_time: endTime,
        p_exclude_session_id: excludeSessionId || null
      });

      if (error) throw error;
      return data as boolean;
    }
  });
};

// Hook to get detailed conflict information for a single student
export const useGetStudentConflicts = () => {
  return useMutation({
    mutationFn: async ({
      studentId,
      lessonDate,
      startTime,
      endTime,
      excludeSessionId
    }: {
      studentId: string;
      lessonDate: string;
      startTime: string;
      endTime: string;
      excludeSessionId?: string;
    }) => {
      const { data, error } = await supabase.rpc('get_student_schedule_conflicts', {
        p_student_id: studentId,
        p_lesson_date: lessonDate,
        p_start_time: startTime,
        p_end_time: endTime,
        p_exclude_session_id: excludeSessionId || null
      });

      if (error) throw error;
      return data as StudentConflict[];
    }
  });
};

// Hook to check conflicts for multiple students at once
export const useCheckMultipleStudentsConflicts = () => {
  return useMutation({
    mutationFn: async ({
      studentIds,
      lessonDate,
      startTime,
      endTime,
      excludeSessionId
    }: {
      studentIds: string[];
      lessonDate: string;
      startTime: string;
      endTime: string;
      excludeSessionId?: string;
    }) => {
      const { data, error } = await supabase.rpc('check_multiple_students_conflicts', {
        p_student_ids: studentIds,
        p_lesson_date: lessonDate,
        p_start_time: startTime,
        p_end_time: endTime,
        p_exclude_session_id: excludeSessionId || null
      });

      if (error) throw error;
      return data.map(item => ({
        student_id: item.student_id,
        has_conflict: item.has_conflict,
        conflict_details: (item.conflict_details as any[]) || []
      })) as StudentConflictResult[];
    }
  });
};

// Hook to manage student-lesson session relationships
export const useStudentLessonSessions = (filters?: { student_id?: string; lesson_session_id?: string }) => {
  return useQuery({
    queryKey: ['student-lesson-sessions', filters],
    queryFn: async () => {
      let query = supabase.from('student_lesson_sessions').select(`
        *,
        students!student_lesson_sessions_student_id_fkey (
          id,
          name,
          age
        ),
        lesson_sessions!student_lesson_sessions_lesson_session_id_fkey (
          id,
          lesson_date,
          start_time,
          end_time,
          teacher_name,
          classroom,
          branch,
          status,
          learning_groups (
            id,
            name,
            level,
            subject
          )
        )
      `);

      if (filters?.student_id) {
        query = query.eq('student_id', filters.student_id);
      }

      if (filters?.lesson_session_id) {
        query = query.eq('lesson_session_id', filters.lesson_session_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    }
  });
};

// Hook to add students to a lesson session
export const useAddStudentsToSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      studentIds,
      lessonSessionId
    }: {
      studentIds: string[];
      lessonSessionId: string;
    }) => {
      const records = studentIds.map(studentId => ({
        student_id: studentId,
        lesson_session_id: lessonSessionId
      }));

      const { data, error } = await supabase
        .from('student_lesson_sessions')
        .insert(records)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-lesson-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session-students'] });
      queryClient.invalidateQueries({ queryKey: ['lesson-sessions'] });
    }
  });
};

// Hook to remove students from a lesson session
export const useRemoveStudentsFromSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      studentIds,
      lessonSessionId
    }: {
      studentIds: string[];
      lessonSessionId: string;
    }) => {
      const { error } = await supabase
        .from('student_lesson_sessions')
        .delete()
        .in('student_id', studentIds)
        .eq('lesson_session_id', lessonSessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-lesson-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session-students'] });
      queryClient.invalidateQueries({ queryKey: ['lesson-sessions'] });
    }
  });
};

// Hook to get students for a specific lesson session
export const useSessionStudents = (lessonSessionId?: string) => {
  return useQuery({
    queryKey: ['session-students', lessonSessionId],
    queryFn: async () => {
      if (!lessonSessionId) return [];

      // First get student IDs from the junction table
      const { data: sessionStudents, error: sessionError } = await supabase
        .from('student_lesson_sessions')
        .select('student_id')
        .eq('lesson_session_id', lessonSessionId);

      if (sessionError) throw sessionError;
      if (!sessionStudents || sessionStudents.length === 0) return [];

      const studentIds = sessionStudents.map(s => s.student_id);

      // Then get the actual student data
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, name, age, status')
        .in('id', studentIds);

      if (studentsError) throw studentsError;
      return (students || []) as Student[];
    },
    enabled: !!lessonSessionId
  });
};