import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentOrganizationId } from '@/lib/organizationHelpers';

/**
 * Hook to search chat messages by message_text content.
 * Returns an array of unique client IDs that have matching messages.
 * Debounced by 400ms for performance (message search is heavier).
 */
export const useMessageContentSearch = (query: string) => {
  const trimmedQuery = query.trim();
  // Debounce message search by 400ms (it's expensive)
  const [debouncedQuery, setDebouncedQuery] = useState(trimmedQuery);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(trimmedQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [trimmedQuery]);

  // Only search if query is 3+ chars
  const enabled = debouncedQuery.length >= 3;

  return useQuery({
    queryKey: ['message-content-search', debouncedQuery],
    enabled,
    staleTime: 60_000, // Cache for 1 minute
    gcTime: 5 * 60_000,
    queryFn: async () => {
      console.log(`[useMessageContentSearch] Searching for: "${debouncedQuery}"`);
      const orgId = await getCurrentOrganizationId();

      const { data, error } = await supabase
        .from('chat_messages')
        .select('client_id')
        .eq('organization_id', orgId)
        .ilike('message_text', `%${debouncedQuery}%`)
        .order('created_at', { ascending: false })
        .limit(100); // Reduced for speed

      if (error) {
        console.error('[useMessageContentSearch] Error:', error);
        throw error;
      }

      // Return unique client_ids
      const uniqueIds = [...new Set((data || []).map(m => m.client_id))];
      console.log(`[useMessageContentSearch] Found ${uniqueIds.length} unique client IDs from ${data?.length || 0} messages`);
      return uniqueIds;
    },
  });
};
