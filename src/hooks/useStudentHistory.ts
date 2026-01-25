import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import type { StudentHistory, Json } from '@/integrations/supabase/database.types';

export interface StudentHistoryEvent extends StudentHistory {
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

      return (data || []).map((event) => {
        const profiles = event.profiles as { first_name?: string; last_name?: string; email?: string } | null;
        return {
          ...event,
          user_name: profiles 
            ? `${profiles.first_name || ''} ${profiles.last_name || ''}`.trim() || profiles.email
            : 'Система'
        };
      }) as StudentHistoryEvent[];
    },
    enabled: !!studentId,
  });
};
