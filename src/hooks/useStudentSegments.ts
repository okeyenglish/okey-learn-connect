import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface StudentSegment {
  id: string;
  name: string;
  description: string | null;
  filters: Record<string, any>;
  created_by: string;
  is_shared: boolean;
  shared_with: string[] | null;
  created_at: string;
  updated_at: string;
}

export const useStudentSegments = () => {
  return useQuery({
    queryKey: ['student-segments'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('student_segments')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as StudentSegment[];
    },
  });
};

export const useCreateSegment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (segment: Omit<StudentSegment, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await (supabase as any)
        .from('student_segments')
        .insert([{
          ...segment,
          created_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-segments'] });
      toast({
        title: "Успех",
        description: "Сегмент сохранен",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateSegment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StudentSegment> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('student_segments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-segments'] });
      toast({
        title: "Успех",
        description: "Сегмент обновлен",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteSegment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('student_segments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-segments'] });
      toast({
        title: "Успех",
        description: "Сегмент удален",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useApplySegmentFilters = (filters: Record<string, any>) => {
  return useQuery({
    queryKey: ['students-by-segment', filters],
    queryFn: async () => {
      let query = supabase.from('students').select('*');

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.branch) {
        query = query.eq('branch', filters.branch) as any;
      }
      if (filters.age_min) {
        query = query.gte('age', filters.age_min);
      }
      if (filters.age_max) {
        query = query.lte('age', filters.age_max);
      }
      if (filters.tags && filters.tags.length > 0) {
        // Get students with specified tags
        const { data: assignments } = await (supabase as any)
          .from('student_tag_assignments')
          .select('student_id')
          .in('tag_id', filters.tags);
        
        if (assignments && Array.isArray(assignments)) {
          const studentIds = assignments.map((a: any) => a.student_id);
          query = query.in('id', studentIds);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: Object.keys(filters).length > 0,
  });
};
