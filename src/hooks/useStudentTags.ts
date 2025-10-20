import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface StudentTag {
  id: string;
  name: string;
  color: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentTagAssignment {
  id: string;
  student_id: string;
  tag_id: string;
  assigned_at: string;
  assigned_by: string | null;
  tag?: StudentTag;
}

export const useStudentTags = () => {
  return useQuery({
    queryKey: ['student-tags'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('student_tags')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as StudentTag[];
    },
  });
};

export const useStudentTagAssignments = (studentId: string) => {
  return useQuery({
    queryKey: ['student-tag-assignments', studentId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('student_tag_assignments')
        .select(`
          *,
          tag:student_tags(*)
        `)
        .eq('student_id', studentId);
      
      if (error) throw error;
      return data as (StudentTagAssignment & { tag: StudentTag })[];
    },
    enabled: !!studentId,
  });
};

export const useCreateTag = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (tag: Omit<StudentTag, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await (supabase as any)
        .from('student_tags')
        .insert([tag])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-tags'] });
      toast({
        title: "Успех",
        description: "Тег создан",
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

export const useAssignTag = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ studentId, tagId }: { studentId: string; tagId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await (supabase as any)
        .from('student_tag_assignments')
        .insert([{
          student_id: studentId,
          tag_id: tagId,
          assigned_by: user?.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-tag-assignments', variables.studentId] });
      toast({
        title: "Успех",
        description: "Тег добавлен",
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

export const useRemoveTag = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ studentId, tagId }: { studentId: string; tagId: string }) => {
      const { error } = await (supabase as any)
        .from('student_tag_assignments')
        .delete()
        .eq('student_id', studentId)
        .eq('tag_id', tagId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-tag-assignments', variables.studentId] });
      toast({
        title: "Успех",
        description: "Тег удален",
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
