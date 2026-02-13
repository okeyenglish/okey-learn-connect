import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Batch-fetches avatar_url for a set of sender_ids from profiles table.
 * Returns a Map<sender_id, avatar_url>.
 */
export function useSenderAvatars(senderIds: string[]) {
  // Deduplicate and filter empty
  const uniqueIds = useMemo(() => {
    const set = new Set(senderIds.filter(Boolean));
    return Array.from(set).sort();
  }, [senderIds.join(',')]);

  const { data } = useQuery({
    queryKey: ['sender-avatars', uniqueIds],
    queryFn: async () => {
      if (uniqueIds.length === 0) return new Map<string, string>();
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, avatar_url')
        .in('id', uniqueIds);

      if (error) {
        console.warn('[useSenderAvatars] Failed:', error.message);
        return new Map<string, string>();
      }

      const map = new Map<string, string>();
      for (const row of data || []) {
        if (row.avatar_url) {
          map.set(row.id, row.avatar_url);
        }
      }
      return map;
    },
    enabled: uniqueIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 min cache
    gcTime: 10 * 60 * 1000,
  });

  return data || new Map<string, string>();
}
