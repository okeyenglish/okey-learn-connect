import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Student {
  id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  age?: number;
  date_of_birth?: string;
  gender?: 'male' | 'female';
  phone?: string;
  email?: string;
  branch?: string;
  avatar_url?: string;
  lk_email?: string;
  lk_enabled?: boolean;
  family_group_id?: string | null;
  status: 'active' | 'inactive' | 'trial' | 'graduated' | 'not_started' | 'on_pause' | 'archived' | 'expelled';
  notes?: string;
  created_at: string;
  updated_at: string;
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

export const useStudents = () => {
  const { data: students, isLoading, error } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });
      
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
    mutationFn: async (studentData: any) => {
      const { data, error } = await supabase
        .from('students')
        .insert([studentData as any])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['students', 'family', data.family_group_id] });
    },
  });
};

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Student> & { id: string }) => {
      const { data, error } = await supabase
        .from('students')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['students', 'family', data.family_group_id] });
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
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['student-courses', data.student_id] });
    },
  });
};