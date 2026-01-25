import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { toast } from 'sonner';

export interface GlobalEntityMapping {
  id: string;
  global_id: string;
  entity_type: 'student' | 'teacher';
  local_id: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

/** DB row for students with student_gid */
interface StudentGidRow {
  student_gid: string | null;
}

/** DB row for profiles with teacher_gid */
interface ProfileTeacherGidRow {
  teacher_gid: string | null;
}

export const useGlobalMapping = (entityType: string, localId: string) => {
  return useQuery({
    queryKey: ['global-mapping', entityType, localId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_entity_mappings')
        .select('*')
        .eq('entity_type', entityType)
        .eq('local_id', localId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as unknown as GlobalEntityMapping | null;
    },
    enabled: Boolean(entityType && localId),
  });
};

export const useGlobalMappings = (filters?: {
  entity_type?: string;
  organization_id?: string;
}) => {
  return useQuery({
    queryKey: ['global-mappings', filters],
    queryFn: async () => {
      let query = supabase.from('global_entity_mappings').select('*');

      if (filters?.entity_type) {
        query = query.eq('entity_type', filters.entity_type);
      }
      if (filters?.organization_id) {
        query = query.eq('organization_id', filters.organization_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as GlobalEntityMapping[];
    },
  });
};

export const useCreateGlobalMapping = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      global_id: string;
      entity_type: 'student' | 'teacher';
      local_id: string;
      organization_id: string;
    }) => {
      const { data, error } = await supabase
        .from('global_entity_mappings')
        .insert(params)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-mappings'] });
      toast.success('Global mapping created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create mapping: ${error.message}`);
    },
  });
};

export const useStudentGlobalId = (studentId: string) => {
  return useQuery({
    queryKey: ['student-gid', studentId],
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from('students')
        .select('student_gid')
        .eq('id', studentId)
        .single();

      if (error) throw error;
      const row = data as unknown as StudentGidRow | null;
      return row?.student_gid ?? null;
    },
    enabled: Boolean(studentId),
  });
};

export const useTeacherGlobalId = (teacherId: string) => {
  return useQuery({
    queryKey: ['teacher-gid', teacherId],
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('teacher_gid')
        .eq('id', teacherId)
        .single();

      if (error) throw error;
      const row = data as unknown as ProfileTeacherGidRow | null;
      return row?.teacher_gid ?? null;
    },
    enabled: Boolean(teacherId),
  });
};
