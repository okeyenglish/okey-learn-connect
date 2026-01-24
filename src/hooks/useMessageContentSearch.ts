import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { getCurrentOrganizationId } from '@/lib/organizationHelpers';

export interface MessageSearchResult {
  clientId: string;
  messengerType: 'whatsapp' | 'telegram' | 'max' | null;
}

// Progressive search intervals in days
const SEARCH_INTERVALS = [90, 180, null]; // null = all time

/**
 * Hook to search chat messages by message_text content using full-text search.
 * Returns an array of client IDs with their messenger types where the message was found.
 * Uses GIN index for faster search.
 * Progressive search: starts with 90 days, expands if no results found.
 * Debounced by 200ms for performance.
 */
export const useMessageContentSearch = (query: string) => {
  const trimmedQuery = query.trim();
  const [debouncedQuery, setDebouncedQuery] = useState(trimmedQuery);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(trimmedQuery);
    }, 200); // Reduced from 300ms to 200ms after index optimization
    return () => clearTimeout(timer);
  }, [trimmedQuery]);

  // Only search if query is 3+ chars
  const enabled = debouncedQuery.length >= 3;

  const queryResult = useQuery({
    queryKey: ['message-content-search', debouncedQuery],
    enabled,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async (): Promise<MessageSearchResult[]> => {
      console.log(`[useMessageContentSearch] Starting progressive FTS search for: "${debouncedQuery}"`);
      const startTime = performance.now();
      const orgId = await getCurrentOrganizationId();

      // Progressive search: try increasingly larger time windows
      for (const daysBack of SEARCH_INTERVALS) {
        const intervalLabel = daysBack ? `${daysBack} days` : 'all time';
        console.log(`[useMessageContentSearch] Searching ${intervalLabel}...`);
        
        const intervalStart = performance.now();
        
        const { data, error } = await supabase
          .rpc('search_messages_by_text' as any, {
            p_org_id: orgId,
            p_search_text: debouncedQuery,
            p_limit: 50,
            p_days_back: daysBack
          });

        const intervalDuration = (performance.now() - intervalStart).toFixed(0);

        if (error) {
          console.error('[useMessageContentSearch] RPC error:', error);
          throw error;
        }

        const results = data as any[] | null;

        if (results && results.length > 0) {
          const totalDuration = (performance.now() - startTime).toFixed(0);
          console.log(`[useMessageContentSearch] Found ${results.length} results in ${intervalLabel} (${intervalDuration}ms, total: ${totalDuration}ms)`);
          
          return results.map((row: { client_id: string; messenger_type: string | null }) => ({
            clientId: row.client_id,
            messengerType: row.messenger_type as 'whatsapp' | 'telegram' | 'max' | null
          }));
        }
        
        console.log(`[useMessageContentSearch] No results in ${intervalLabel} (${intervalDuration}ms), expanding...`);
      }

      const totalDuration = (performance.now() - startTime).toFixed(0);
      console.log(`[useMessageContentSearch] No results found in any interval (total: ${totalDuration}ms)`);
      return [];
    },
  });

  // Create a map for quick messenger type lookup
  const messengerTypeMap = new Map<string, 'whatsapp' | 'telegram' | 'max' | null>();
  if (queryResult.data) {
    queryResult.data.forEach(result => {
      messengerTypeMap.set(result.clientId, result.messengerType);
    });
  }

  // Also return clientIds for backward compatibility
  const clientIds = queryResult.data?.map(r => r.clientId) || [];

  return {
    ...queryResult,
    data: clientIds,
    results: queryResult.data || [],
    messengerTypeMap,
    getMessengerType: (clientId: string) => messengerTypeMap.get(clientId) || null
  };
};
