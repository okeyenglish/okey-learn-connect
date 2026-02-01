import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format } from 'date-fns';

export const useMyOverdueTasks = () => {
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['my-overdue-tasks', user?.id, today],
    queryFn: async () => {
      if (!user?.id) return { count: 0 };

      // Query staff_tasks for overdue tasks assigned to current user
      const { count, error } = await supabase
        .from('staff_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('assignee_id', user.id)
        .lt('due_date', today)
        .neq('status', 'completed')
        .neq('status', 'cancelled');

      if (error) {
        console.error('Error fetching overdue tasks:', error);
        return { count: 0 };
      }

      return { count: count || 0 };
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    overdueCount: data?.count || 0,
    isLoading,
  };
};
