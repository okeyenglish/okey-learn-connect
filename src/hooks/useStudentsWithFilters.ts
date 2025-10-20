import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Student } from './useStudents';

export interface StudentFilters {
  searchTerm?: string;
  branch?: string;
  status?: string;
  level?: string;
  ageMin?: number;
  ageMax?: number;
  hasDebt?: boolean;
  hasParent?: boolean;
  parentId?: string;
  createdFrom?: string;
  createdTo?: string;
}

export const useStudentsWithFilters = (filters?: StudentFilters) => {
  return useQuery({
    queryKey: ['students', 'filtered', filters],
    queryFn: async (): Promise<Student[]> => {
      let query = supabase
        .from('students')
        .select(`
          *,
          student_balances (balance),
          family_groups!family_group_id (
            id,
            family_members (
              client_id,
              clients (id, full_name)
            )
          )
        `)
        .order('created_at', { ascending: false }) as any;

      // Поиск по имени, телефону, email
      if (filters?.searchTerm && filters.searchTerm.trim()) {
        const term = filters.searchTerm.trim().toLowerCase();
        query = query.or(
          `name.ilike.%${term}%,first_name.ilike.%${term}%,last_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`
        );
      }

      // Фильтр по филиалу
      if (filters?.branch && filters.branch !== 'all') {
        query = query.eq('branch', filters.branch);
      }

      // Фильтр по статусу
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status as any);
      }

      // Фильтр по возрасту
      if (filters?.ageMin !== undefined) {
        query = query.gte('age', filters.ageMin);
      }
      if (filters?.ageMax !== undefined) {
        query = query.lte('age', filters.ageMax);
      }

      // Фильтр по дате создания
      if (filters?.createdFrom) {
        query = query.gte('created_at', filters.createdFrom);
      }
      if (filters?.createdTo) {
        query = query.lte('created_at', filters.createdTo);
      }

      const { data, error } = await query;
      if (error) throw error;

      let students = (data || []) as any[];

      // Постфильтрация (клиентская сторона)
      if (filters?.hasDebt !== undefined && filters.hasDebt) {
        students = students.filter(s => {
          const balance = s.student_balances?.[0]?.balance || 0;
          return balance < 0;
        });
      }

      if (filters?.hasParent !== undefined && filters.hasParent) {
        students = students.filter(s => s.family_group_id !== null);
      }

      if (filters?.parentId) {
        students = students.filter(s => {
          const familyMembers = s.family_groups?.family_members || [];
          return familyMembers.some((m: any) => m.client_id === filters.parentId);
        });
      }

      return students as Student[];
    },
  });
};
