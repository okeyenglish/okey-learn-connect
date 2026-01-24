import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { toast } from 'sonner';

export interface ConflictCheck {
  has_conflict: boolean;
  conflict_details: Array<{
    session_id: string;
    group_name: string;
    start_time: string;
    end_time: string;
    teacher?: string;
    classroom?: string;
    branch?: string;
  }>;
}

export const useCheckStudentConflict = (
  studentId: string | undefined,
  startTime: string | undefined,
  endTime: string | undefined,
  excludeSessionId?: string
) => {
  return useQuery({
    queryKey: ['student-conflict', studentId, startTime, endTime, excludeSessionId],
    queryFn: async () => {
      if (!studentId || !startTime || !endTime) return null;

      const { data, error } = await supabase.rpc('check_student_schedule_conflict' as any, {
        p_student_id: studentId,
        p_start_time: startTime,
        p_end_time: endTime,
        p_exclude_session_id: excludeSessionId || null,
      });

      if (error) throw error;
      return data as unknown as ConflictCheck[];
    },
    enabled: Boolean(studentId && startTime && endTime),
  });
};

export const useCheckTeacherConflict = (
  teacherId: string | undefined,
  startTime: string | undefined,
  endTime: string | undefined,
  excludeSessionId?: string
) => {
  return useQuery({
    queryKey: ['teacher-conflict', teacherId, startTime, endTime, excludeSessionId],
    queryFn: async () => {
      if (!teacherId || !startTime || !endTime) return null;

      const { data, error } = await supabase.rpc('check_teacher_double_booking' as any, {
        p_teacher_id: teacherId,
        p_start_time: startTime,
        p_end_time: endTime,
        p_exclude_session_id: excludeSessionId || null,
      });

      if (error) throw error;
      return data as unknown as ConflictCheck[];
    },
    enabled: Boolean(teacherId && startTime && endTime),
  });
};

export const useCheckRoomConflict = (
  classroom: string | undefined,
  branch: string | undefined,
  startTime: string | undefined,
  endTime: string | undefined,
  excludeSessionId?: string
) => {
  return useQuery({
    queryKey: ['room-conflict', classroom, branch, startTime, endTime, excludeSessionId],
    queryFn: async () => {
      if (!classroom || !branch || !startTime || !endTime) return null;

      const { data, error } = await supabase.rpc('check_room_conflict' as any, {
        p_classroom: classroom,
        p_branch: branch,
        p_start_time: startTime,
        p_end_time: endTime,
        p_exclude_session_id: excludeSessionId || null,
      });

      if (error) throw error;
      return data as unknown as ConflictCheck[];
    },
    enabled: Boolean(classroom && branch && startTime && endTime),
  });
};

export const useCheckAllConflicts = (
  studentId?: string,
  teacherId?: string,
  classroom?: string,
  branch?: string,
  startTime?: string,
  endTime?: string,
  excludeSessionId?: string
) => {
  const studentConflict = useCheckStudentConflict(studentId, startTime, endTime, excludeSessionId);
  const teacherConflict = useCheckTeacherConflict(teacherId, startTime, endTime, excludeSessionId);
  const roomConflict = useCheckRoomConflict(classroom, branch, startTime, endTime, excludeSessionId);

  const hasAnyConflict =
    (studentConflict.data?.[0]?.has_conflict) ||
    (teacherConflict.data?.[0]?.has_conflict) ||
    (roomConflict.data?.[0]?.has_conflict);

  const allConflicts = {
    student: studentConflict.data?.[0],
    teacher: teacherConflict.data?.[0],
    room: roomConflict.data?.[0],
  };

  return {
    hasAnyConflict,
    conflicts: allConflicts,
    isLoading:
      studentConflict.isLoading ||
      teacherConflict.isLoading ||
      roomConflict.isLoading,
  };
};
