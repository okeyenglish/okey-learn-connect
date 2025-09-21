import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  branch: string | null;
  department: string | null;
}

export const useEmployees = (branch?: string) => {
  return useQuery({
    queryKey: ['employees', branch],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, first_name, last_name, email, branch, department')
        .order('first_name');

      if (branch) {
        query = query.eq('branch', branch);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching employees:', error);
        throw error;
      }

      return data || [];
    },
  });
};

export const getEmployeeFullName = (employee: Employee): string => {
  const firstName = employee.first_name || '';
  const lastName = employee.last_name || '';
  return `${firstName} ${lastName}`.trim() || employee.email || 'Неизвестный сотрудник';
};