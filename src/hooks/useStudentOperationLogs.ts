import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StudentOperationLog {
  id: string;
  student_id: string;
  operation_type: 
    | 'created' 
    | 'updated' 
    | 'status_changed' 
    | 'enrolled_to_group' 
    | 'expelled_from_group' 
    | 'transferred' 
    | 'archived' 
    | 'restored'
    | 'payment_added'
    | 'lk_access_granted'
    | 'lk_access_revoked';
  old_value: Record<string, any> | null;
  new_value: Record<string, any> | null;
  notes: string | null;
  performed_by: string | null;
  performed_at: string;
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
      const { data, error } = await (supabase as any)
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

      const { data, error } = await (supabase as any)
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
