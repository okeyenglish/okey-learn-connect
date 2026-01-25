import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/typedClient";
import type { StudentOperationLog as DBStudentOperationLog } from "@/integrations/supabase/database.types";

export interface StudentOperationLog extends DBStudentOperationLog {
  performer?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export const useStudentOperationLogs = (studentId: string) => {
  return useQuery({
    queryKey: ['student-operation-logs', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_operation_logs')
        .select(`
          *,
          performer:performed_by(
            first_name,
            last_name,
            email
          )
        `)
        .eq('student_id', studentId)
        .order('performed_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as unknown as StudentOperationLog[];
    },
    enabled: !!studentId,
  });
};

export const useLogStudentOperation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (log: Omit<StudentOperationLog, 'id' | 'performed_at' | 'performer'>) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('student_operation_logs')
        .insert([{
          ...log,
          performed_by: user?.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-operation-logs', variables.student_id] });
    },
  });
};
