import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
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
      console.log(`[useClientIdsByPhoneSearch] Searching for phone: ${normalized}`);
      const orgId = await getCurrentOrganizationId();
      console.log(`[useClientIdsByPhoneSearch] Organization ID: ${orgId}`);

      const { data, error } = await supabase
        .from('clients')
        .select('id')
        .eq('organization_id', orgId)
        .neq('status', 'deleted')
        .ilike('phone', `%${normalized}%`)
        .limit(50);

      if (error) {
        console.error('[useClientIdsByPhoneSearch] Error:', error);
        throw error;
      }

      const ids = new Set<string>();
      (data || []).forEach((row: any) => {
        if (row?.id) ids.add(row.id);
      });
      
      console.log(`[useClientIdsByPhoneSearch] Found ${ids.size} client IDs:`, Array.from(ids));
      return Array.from(ids);
    },
  });
};
