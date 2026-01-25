import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import type { Task } from '@/integrations/supabase/database.types';

export interface TaskLazy extends Task {
  clients?: {
    id: string;
    name: string;
    phone?: string;
  } | null;
}

// Lazy-loaded version of useAllTasks - only loads when enabled
export const useTasksLazy = (enabled: boolean = false) => {
  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Task[];
    },
    enabled, // Only fetch when explicitly enabled
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    tasks: tasks || [],
    isLoading,
    error,
  };
};
