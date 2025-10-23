import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useLeadsCount = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['leads', 'count'],
    queryFn: async () => {
      // Get all students who are NOT in active learning groups or individual lessons
      // Step 1: Get all student IDs
      const { data: allStudents, error: studentsError } = await supabase
        .from('students')
        .select('id');
      
      if (studentsError) throw studentsError;
      if (!allStudents) return 0;

      const allStudentIds = new Set(allStudents.map(s => s.id));

      // Step 2: Get student IDs from active group students
      const { data: groupStudents, error: groupError } = await supabase
        .from('group_students')
        .select('student_id')
        .eq('status', 'active');
      
      if (groupError) throw groupError;

      // Step 3: Get student IDs from active individual lessons
      const { data: individualStudents, error: individualError } = await supabase
        .from('individual_lessons')
        .select('student_id')
        .eq('is_active', true)
        .eq('status', 'active');
      
      if (individualError) throw individualError;

      // Combine active students from both groups and individual lessons
      const activeStudentIds = new Set([
        ...(groupStudents || []).map(gs => gs.student_id),
        ...(individualStudents || []).map(il => il.student_id)
      ]);

      // Count students who are NOT in the active set
      const leadsCount = allStudents.filter(s => !activeStudentIds.has(s.id)).length;

      return leadsCount;
    },
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false,
  });

  return {
    count: data ?? 0,
    isLoading,
    error
  };
};
