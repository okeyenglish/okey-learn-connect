import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { WorkingHours, formatWorkingHours, formatWorkingHoursShort } from '@/components/settings/WorkingHoursEditor';

export interface PublicBranch {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  working_hours: WorkingHours | null;
  working_hours_formatted: string;
  working_hours_short: string;
}

export const usePublicBranches = () => {
  return useQuery({
    queryKey: ['public-branches'],
    queryFn: async (): Promise<PublicBranch[]> => {
      const { data, error } = await supabase
        .from('organization_branches')
        .select('id, name, address, phone, email, working_hours, sort_order')
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching public branches:', error);
        return [];
      }

      return (data || []).map((branch) => {
        const workingHours = branch.working_hours as unknown as WorkingHours | null;
        return {
          id: branch.id,
          name: branch.name,
          address: branch.address,
          phone: branch.phone,
          email: branch.email,
          working_hours: workingHours,
          working_hours_formatted: formatWorkingHours(workingHours),
          working_hours_short: formatWorkingHoursShort(workingHours),
        };
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
};

// Хук для получения данных одного филиала
export const usePublicBranch = (branchId: string) => {
  return useQuery({
    queryKey: ['public-branch', branchId],
    queryFn: async (): Promise<PublicBranch | null> => {
      const { data, error } = await supabase
        .from('organization_branches')
        .select('id, name, address, phone, email, working_hours')
        .eq('id', branchId)
        .single();

      if (error) {
        console.error('Error fetching public branch:', error);
        return null;
      }

      if (!data) return null;

      const workingHours = data.working_hours as unknown as WorkingHours | null;
      return {
        id: data.id,
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email,
        working_hours: workingHours,
        working_hours_formatted: formatWorkingHours(workingHours),
        working_hours_short: formatWorkingHoursShort(workingHours),
      };
    },
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000,
  });
};
