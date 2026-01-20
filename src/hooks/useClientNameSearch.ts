import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentOrganizationId } from '@/lib/organizationHelpers';

/**
 * Hook to search clients by name, first_name, or last_name fields.
 * Returns an array of matching client IDs.
 */
export const useClientNameSearch = (query: string) => {
  const trimmedQuery = query.trim();
  // Only search if query is 2+ chars and NOT a phone number
  const isPhoneSearch = /^\d{5,}$/.test(trimmedQuery.replace(/[\s\+\-\(\)]/g, ''));
  const enabled = trimmedQuery.length >= 2 && !isPhoneSearch;

  return useQuery({
    queryKey: ['client-name-search', trimmedQuery],
    enabled,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      console.log(`[useClientNameSearch] Searching for: "${trimmedQuery}"`);
      const orgId = await getCurrentOrganizationId();

      const { data, error } = await supabase
        .from('clients')
        .select('id')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .or(`name.ilike.%${trimmedQuery}%,first_name.ilike.%${trimmedQuery}%,last_name.ilike.%${trimmedQuery}%`)
        .limit(50);

      if (error) {
        console.error('[useClientNameSearch] Error:', error);
        throw error;
      }

      const ids = (data || []).map(c => c.id);
      console.log(`[useClientNameSearch] Found ${ids.length} client IDs`);
      return ids;
    },
  });
};
