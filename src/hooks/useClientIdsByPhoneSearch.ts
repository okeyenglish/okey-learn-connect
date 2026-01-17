import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentOrganizationId } from '@/lib/organizationHelpers';

const normalizePhoneForSearch = (input: string) => input.replace(/[\s\+\-\(\)]/g, '');

export const useClientIdsByPhoneSearch = (rawQuery: string) => {
  const normalized = normalizePhoneForSearch(rawQuery);
  const isPhoneSearch = /^\d{5,}$/.test(normalized);

  return useQuery({
    queryKey: ['client-ids-by-phone-search', normalized],
    enabled: isPhoneSearch,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const orgId = await getCurrentOrganizationId();

      const { data, error } = await supabase
        .from('client_phone_numbers')
        .select('client_id, clients!inner(organization_id, is_active)')
        .eq('clients.organization_id', orgId)
        .eq('clients.is_active', true)
        .ilike('phone', `%${normalized}%`)
        .limit(50);

      if (error) throw error;

      const ids = new Set<string>();
      (data || []).forEach((row: any) => {
        if (row?.client_id) ids.add(row.client_id);
      });
      return Array.from(ids);
    },
  });
};
