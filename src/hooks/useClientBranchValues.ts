import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toBranchKey } from '@/lib/branchUtils';

/**
 * Fetches all distinct branch values from the clients table,
 * groups them by normalized key via toBranchKey().
 * 
 * This allows translating a UI filter (normalized key like "мытищи")
 * into all raw DB values that match (e.g., "Мытищи", "O'KEY ENGLISH Мытищи").
 */
export function useClientBranchValues() {
  const { data: branchMap } = useQuery({
    queryKey: ['client-branch-raw-values'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('branch')
        .not('branch', 'is', null);

      if (error) {
        console.warn('[useClientBranchValues] Failed to fetch branches:', error.message);
        return new Map<string, Set<string>>();
      }

      const map = new Map<string, Set<string>>();
      for (const row of data || []) {
        if (!row.branch) continue;
        const key = toBranchKey(row.branch);
        if (!key) continue;
        if (!map.has(key)) map.set(key, new Set());
        map.get(key)!.add(row.branch);
      }
      return map;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const getRawValues = useCallback((normalizedKey: string): string[] => {
    if (!normalizedKey || !branchMap) return [];
    return Array.from(branchMap.get(normalizedKey) || []);
  }, [branchMap]);

  return { branchMap, getRawValues };
}
