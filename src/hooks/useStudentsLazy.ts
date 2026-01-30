import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import type { Student } from '@/integrations/supabase/database.types';

export type { Student };

// Lazy-loaded version of useStudents - only loads when enabled
export const useStudentsLazy = (enabled: boolean = false) => {
  const { data: students, isLoading, error } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10000);
      
      if (error) throw error;
      return data as Student[];
    },
    enabled, // Only fetch when explicitly enabled
    staleTime: 10 * 60 * 1000, // 10 minutes - студенты не меняются часто
    gcTime: 30 * 60 * 1000, // 30 minutes cache
  });

  return {
    students: students || [],
    isLoading,
    error,
  };
};
