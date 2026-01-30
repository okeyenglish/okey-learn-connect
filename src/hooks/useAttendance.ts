import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface AttendanceRecord {
  id: string;
  lessonSessionId?: string;
  individualLessonSessionId?: string;
  studentId: string;
  status: 'present' | 'absent' | 'late' | 'excused' | 'completed';
  notes?: string;
  markedBy?: string;
  markedAt?: string;
}

interface AttendanceRow {
  id: string;
  lesson_session_id?: string | null;
  individual_lesson_session_id?: string | null;
  student_id: string;
  status: string;
  notes?: string | null;
  marked_by?: string | null;
  marked_at?: string | null;
}

interface SessionRow {
  id: string;
}

export const useAttendance = (sessionId: string, sessionType: 'group' | 'individual') => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: attendance, isLoading } = useQuery({
    queryKey: ['attendance', sessionType, sessionId],
    queryFn: async () => {
      const column = sessionType === 'group' ? 'lesson_session_id' : 'individual_lesson_session_id';
      
      const { data, error } = await supabase
        .from('student_attendance')
        .select('*')
        .eq(column, sessionId);

      if (error) throw error;
      
      const rows = (data || []) as AttendanceRow[];
      return rows.map(record => ({
        id: record.id,
        lessonSessionId: record.lesson_session_id ?? undefined,
        individualLessonSessionId: record.individual_lesson_session_id ?? undefined,
        studentId: record.student_id,
        status: record.status as 'present' | 'absent' | 'late' | 'excused' | 'completed',
        notes: record.notes ?? undefined,
        markedBy: record.marked_by ?? undefined,
        markedAt: record.marked_at ?? undefined,
      })) as AttendanceRecord[];
    },
    enabled: !!sessionId,
  });

  const markAttendance = useMutation({
    mutationFn: async (records: Array<{ studentId: string; status: string; notes?: string }>) => {
      if (!user) throw new Error('Not authenticated');

      const column = sessionType === 'group' ? 'lesson_session_id' : 'individual_lesson_session_id';
      
      // Delete existing attendance records for this session
      await supabase
        .from('student_attendance')
        .delete()
        .eq(column, sessionId);

      // Insert new records
      const { error } = await supabase
        .from('student_attendance')
        .insert(
          records.map(record => ({
            [column]: sessionId,
            student_id: record.studentId,
            status: record.status,
            notes: record.notes,
            marked_by: user.id,
            marked_at: new Date().toISOString(),
          }))
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', sessionType, sessionId] });
      toast({
        title: 'Успешно',
        description: 'Посещаемость отмечена',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось отметить посещаемость',
        variant: 'destructive',
      });
    },
  });

  return {
    attendance,
    isLoading,
    markAttendance: markAttendance.mutate,
    isMarking: markAttendance.isPending,
  };
};

// Hook to check if attendance is marked for a specific date
export const useAttendanceStatus = (lessonDate: string, lessonId: string, sessionType: 'group' | 'individual') => {
  return useQuery({
    queryKey: ['attendance-status', sessionType, lessonId, lessonDate],
    queryFn: async () => {
      // First, get the session ID for this date
      if (sessionType === 'individual') {
        const { data: session } = await supabase
          .from('individual_lesson_sessions')
          .select('id')
          .eq('individual_lesson_id', lessonId)
          .eq('lesson_date', lessonDate)
          .maybeSingle();

        const sessionRow = session as SessionRow | null;

        if (!sessionRow) return { isMarked: false, count: 0 };

        const { data } = await supabase
          .from('student_attendance')
          .select('id')
          .eq('individual_lesson_session_id', sessionRow.id);

        return { isMarked: (data || []).length > 0, count: (data || []).length };
      } else {
        const { data: session } = await supabase
          .from('lesson_sessions')
          .select('id')
          .eq('group_id', lessonId)
          .eq('lesson_date', lessonDate)
          .maybeSingle();

        const sessionRow = session as SessionRow | null;

        if (!sessionRow) return { isMarked: false, count: 0 };

        const { data } = await supabase
          .from('student_attendance')
          .select('id')
          .eq('lesson_session_id', sessionRow.id);

        return { isMarked: (data || []).length > 0, count: (data || []).length };
      }
    },
    enabled: !!lessonDate && !!lessonId,
  });
};
