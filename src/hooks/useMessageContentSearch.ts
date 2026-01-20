import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentOrganizationId } from '@/lib/organizationHelpers';

/**
 * Hook to search chat messages by message_text content.
 * Returns an array of unique client IDs that have matching messages.
 */
export const useMessageContentSearch = (query: string) => {
  const trimmedQuery = query.trim();
  // Only search if query is 3+ chars (message search is expensive)
  const enabled = trimmedQuery.length >= 3;

  return useQuery({
    queryKey: ['message-content-search', trimmedQuery],
    enabled,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      console.log(`[useMessageContentSearch] Searching for: "${trimmedQuery}"`);
      const orgId = await getCurrentOrganizationId();

      const { data, error } = await supabase
        .from('chat_messages')
        .select('client_id')
        .eq('organization_id', orgId)
        .ilike('message_text', `%${trimmedQuery}%`)
        .order('created_at', { ascending: false })
        .limit(200);

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
