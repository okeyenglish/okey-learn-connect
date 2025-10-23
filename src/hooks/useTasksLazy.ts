import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TaskLazy {
  id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  priority: string;
  status: string;
  client_id?: string | null;
  branch?: string | null;
  created_at: string;
  updated_at: string;
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
        .order('created_at', { ascending: false});
      
      if (error) throw error;
      return data as any[];
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