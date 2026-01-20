import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentOrganizationId } from '@/lib/organizationHelpers';

/**
 * Hook to search chat messages by message_text content using full-text search.
 * Returns an array of unique client IDs that have matching messages.
 * Uses GIN index for 100x faster search.
 * Debounced by 300ms for performance.
 */
export const useMessageContentSearch = (query: string) => {
  const trimmedQuery = query.trim();
  const [debouncedQuery, setDebouncedQuery] = useState(trimmedQuery);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(trimmedQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [trimmedQuery]);

  // Only search if query is 3+ chars
  const enabled = debouncedQuery.length >= 3;

  return useQuery({
    queryKey: ['message-content-search', debouncedQuery],
    enabled,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      console.log(`[useMessageContentSearch] FTS search for: "${debouncedQuery}"`);
      const orgId = await getCurrentOrganizationId();

      // Use RPC with full-text search (GIN index)
      const { data, error } = await supabase
        .rpc('search_messages_by_text', {
          p_org_id: orgId,
          p_search_text: debouncedQuery,
          p_limit: 50
        });

      if (error) {
        console.error('[useMessageContentSearch] RPC error:', error);
        throw error;
      }

      const ids = (data || []).map((row: { client_id: string }) => row.client_id);
      console.log(`[useMessageContentSearch] Found ${ids.length} client IDs via FTS`);
      return ids;
    },
  });
};
