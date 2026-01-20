import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentOrganizationId } from '@/lib/organizationHelpers';

/**
 * Hook to search clients by name, first_name, or last_name fields.
 * Returns an array of matching client IDs.
 * Debounced by 200ms for performance.
 */
export const useClientNameSearch = (query: string) => {
  const trimmedQuery = query.trim();
  // Debounce the query by 200ms
  const [debouncedQuery, setDebouncedQuery] = useState(trimmedQuery);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(trimmedQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [trimmedQuery]);

  // Only search if query is 2+ chars and NOT a phone number
  const isPhoneSearch = /^\d{5,}$/.test(debouncedQuery.replace(/[\s\+\-\(\)]/g, ''));
  const enabled = debouncedQuery.length >= 2 && !isPhoneSearch;

  return useQuery({
    queryKey: ['client-name-search', debouncedQuery],
    enabled,
    staleTime: 60_000, // Cache for 1 minute
    gcTime: 5 * 60_000,
    queryFn: async () => {
      console.log(`[useClientNameSearch] Searching for: "${debouncedQuery}"`);
      const orgId = await getCurrentOrganizationId();

      const { data, error } = await supabase
        .from('clients')
        .select('id')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .or(`name.ilike.%${debouncedQuery}%,first_name.ilike.%${debouncedQuery}%,last_name.ilike.%${debouncedQuery}%`)
        .limit(100);

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
