import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  subjects: string[];
  categories: string[];
  branch: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeacherFilters {
  subject?: string;
  category?: string;
  branch?: string;
}

export const useTeachers = (filters?: TeacherFilters) => {
  const { data: teachers, isLoading, error } = useQuery({
    queryKey: ['teachers', filters],
    queryFn: async () => {
      let query = supabase
        .from('teachers')
        .select('*')
        .eq('is_active', true)
        .order('last_name', { ascending: true });

      // Apply filters
      if (filters?.branch) {
        query = query.eq('branch', filters.branch);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Filter by subject and category in JavaScript since they are arrays
      let filteredData = data as Teacher[];
      
      if (filters?.subject) {
        filteredData = filteredData.filter(teacher => 
          teacher.subjects.includes(filters.subject!)
        );
      }
      
      if (filters?.category) {
        filteredData = filteredData.filter(teacher => 
          teacher.categories.includes(filters.category!)
        );
      }
      
      return filteredData;
    },
  });

  return {
    teachers: teachers || [],
    isLoading,
    error,
  };
};

export const getTeacherFullName = (teacher: Teacher): string => {
  return `${teacher.last_name} ${teacher.first_name}`;
};

export const getFilteredTeachers = (teachers: Teacher[], subject: string, category: string): Teacher[] => {
  return teachers.filter(teacher => 
    teacher.subjects.includes(subject) && 
    teacher.categories.includes(category)
  );
};