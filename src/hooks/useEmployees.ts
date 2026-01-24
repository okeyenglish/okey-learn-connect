import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';

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
      const { data, error } = await supabase.functions.invoke('get-employees', {
        body: { branch: branch || null },
      });
      if (error) {
        console.error('Error fetching employees:', error);
        throw error;
      }
      return (data?.employees ?? []) as Employee[];
    },
  });
};

export const getEmployeeFullName = (employee: Employee): string => {
  const firstName = employee.first_name || '';
  const lastName = employee.last_name || '';
  return `${firstName} ${lastName}`.trim() || employee.email || 'Неизвестный сотрудник';
};