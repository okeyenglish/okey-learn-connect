import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useStudentsCount = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['students', 'count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 60_000, // 1 min
  });

  return { count: data ?? 0, isLoading, error };
};