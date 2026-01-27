import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import type { Teacher } from '@/integrations/supabase/database.types';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errorUtils';

export type { Teacher };

export interface TeacherFilters {
  subject?: string;
  category?: string;
  branch?: string;
  includeInactive?: boolean;
}

export const useTeachers = (filters?: TeacherFilters) => {
  const queryClient = useQueryClient();

  const { data: teachers, isLoading, error, refetch } = useQuery({
    queryKey: ['teachers', filters],
    queryFn: async () => {
      let query = supabase
        .from('teachers')
        .select('*')
        .order('last_name', { ascending: true });

      // По умолчанию показываем только активных
      if (!filters?.includeInactive) {
        query = query.eq('is_active', true);
      }

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
          teacher.subjects?.includes(filters.subject!) ?? false
        );
      }
      
      if (filters?.category) {
        filteredData = filteredData.filter(teacher => 
          teacher.categories?.includes(filters.category!) ?? false
        );
      }
      
      return filteredData;
    },
  });

  // Мутация для обновления преподавателя
  const updateTeacher = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<Teacher> }) => {
      const { error } = await supabase
        .from('teachers')
        .update(data.updates)
        .eq('id', data.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: (error) => {
      toast.error('Ошибка: ' + getErrorMessage(error));
    },
  });

  // Мутация для деактивации/активации
  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('teachers')
        .update({ is_active: isActive })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast.success(isActive ? 'Преподаватель активирован' : 'Преподаватель деактивирован');
    },
    onError: (error) => {
      toast.error('Ошибка: ' + getErrorMessage(error));
    },
  });

  return {
    teachers: teachers || [],
    isLoading,
    error,
    refetch,
    updateTeacher,
    toggleActive,
  };
};

export const getTeacherFullName = (teacher: Teacher): string => {
  return `${teacher.last_name || ''} ${teacher.first_name}`.trim();
};

export const getFilteredTeachers = (teachers: Teacher[], subject: string, category: string): Teacher[] => {
  return teachers.filter(teacher => 
    (teacher.subjects?.includes(subject) ?? false) && 
    (teacher.categories?.includes(category) ?? false)
  );
};
