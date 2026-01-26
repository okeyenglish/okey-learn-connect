import { useQuery } from '@tanstack/react-query';
import { selfHostedPost } from '@/lib/selfHostedApi';

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
      const response = await selfHostedPost<{ employees: Employee[] }>('get-employees', {
        branch: branch || null,
      });
      
      if (!response.success) {
        console.error('Error fetching employees:', response.error);
        throw new Error(response.error || 'Failed to fetch employees');
      }
      
      return response.data?.employees ?? [];
    },
  });
};

export const getEmployeeFullName = (employee: Employee): string => {
  const firstName = employee.first_name || '';
  const lastName = employee.last_name || '';
  return `${firstName} ${lastName}`.trim() || employee.email || 'Неизвестный сотрудник';
};
