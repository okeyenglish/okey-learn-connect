import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import type { Student as DBStudent } from '@/integrations/supabase/database.types';

export interface Student extends Omit<DBStudent, 'is_active'> {
  is_active?: boolean;
}

export interface StudentCourse {
  id: string;
  student_id: string;
  course_name: string;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  payment_amount?: number;
  next_payment_date?: string;
  next_lesson_date?: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyGroup {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  family_group_id: string;
  client_id: string;
  relationship_type: 'main' | 'spouse' | 'parent' | 'guardian' | 'other';
  is_primary_contact: boolean;
  created_at: string;
}

type StudentInsert = Partial<Omit<Student, 'id' | 'created_at' | 'updated_at'>>;
type StudentUpdate = Partial<Omit<Student, 'id' | 'created_at'>>;

export const useStudents = () => {
  const { data: students, isLoading, error } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10000); // Увеличен лимит до 10000 студентов
      
      if (error) throw error;
      return data as Student[];
    },
  });

  return {
    students: students || [],
    isLoading,
    error,
  };
};

export const useStudentsByFamily = (familyGroupId: string) => {
  const { data: students, isLoading, error } = useQuery({
    queryKey: ['students', 'family', familyGroupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('family_group_id', familyGroupId)
        .order('age', { ascending: false });
      
      if (error) throw error;
      return data as Student[];
    },
    enabled: !!familyGroupId,
  });

  return {
    students: students || [],
    isLoading,
    error,
  };
};

export const useStudentCourses = (studentId: string) => {
  const { data: courses, isLoading, error } = useQuery({
    queryKey: ['student-courses', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_courses')
        .select('*')
        .eq('student_id', studentId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as StudentCourse[];
    },
    enabled: !!studentId,
  });

  return {
    courses: courses || [],
    isLoading,
    error,
  };
};

export const useFamilyGroup = (familyGroupId: string) => {
  const { data: familyGroup, isLoading, error } = useQuery({
    queryKey: ['family-group', familyGroupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('family_groups')
        .select(`
          *,
          family_members (
            *,
            clients (*)
          ),
          students (*)
        `)
        .eq('id', familyGroupId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!familyGroupId,
  });

  return {
    familyGroup,
    isLoading,
    error,
  };
};

export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (studentData: StudentInsert) => {
      const { data, error } = await supabase
        .from('students')
        .insert([studentData])
        .select()
        .single();
      
      if (error) throw error;
      return data as Student;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      if (data.family_group_id) {
        queryClient.invalidateQueries({ queryKey: ['students', 'family', data.family_group_id] });
      }
    },
  });
};

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: StudentUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('students')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Student;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      if (data.family_group_id) {
        queryClient.invalidateQueries({ queryKey: ['students', 'family', data.family_group_id] });
      }
    },
  });
};

export const useAddStudentCourse = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (courseData: Omit<StudentCourse, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('student_courses')
        .insert([courseData])
        .select()
        .single();
      
      if (error) throw error;
      return data as StudentCourse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['student-courses', data.student_id] });
    },
  });
};
