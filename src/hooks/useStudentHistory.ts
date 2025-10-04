import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StudentHistoryEvent {
  id: string;
  student_id: string;
  event_type: string;
  event_category: string;
  title: string;
  description: string | null;
  old_value: any;
  new_value: any;
  changed_by: string | null;
  created_at: string;
  user_name?: string;
}

export const useStudentHistory = (studentId: string) => {
  return useQuery({
    queryKey: ['student-history', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_history')
        .select(`
          *,
          profiles:changed_by (
            first_name,
            last_name,
            email
          )
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((event: any) => ({
        ...event,
        user_name: event.profiles 
          ? `${event.profiles.first_name || ''} ${event.profiles.last_name || ''}`.trim() || event.profiles.email
          : 'Система'
      })) as StudentHistoryEvent[];
    },
    enabled: !!studentId,
  });
};