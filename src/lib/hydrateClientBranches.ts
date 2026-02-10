import { supabase } from '@/integrations/supabase/typedClient';
import type { ChatThread } from '@/hooks/useChatMessages';

/**
 * In-memory cache for client branches with TTL.
 * Prevents redundant SELECT queries to `clients` table when RPC doesn't return branch data.
 */
const branchCache = new Map<string, { branch: string | null; cachedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCachedBranch(clientId: string): string | null | undefined {
  const entry = branchCache.get(clientId);
  if (!entry) return undefined; // cache miss
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    branchCache.delete(clientId);
    return undefined; // expired
  }
  return entry.branch;
}

function setCachedBranches(map: Map<string, string | null>) {
  const now = Date.now();
  map.forEach((branch, id) => {
    branchCache.set(id, { branch, cachedAt: now });
  });
}

/**
 * Hydrates missing `client_branch` values on threads by querying the `clients` table.
 * Uses an in-memory cache (5 min TTL) to avoid redundant DB hits.
 */
export async function hydrateClientBranches(threads: ChatThread[]): Promise<ChatThread[]> {
  if (!threads || threads.length === 0) return threads;

  // Determine which threads need hydration and aren't cached
  const uncachedIds: string[] = [];
  const cachedResults = new Map<string, string | null>();

  for (const t of threads) {
    if (t.client_branch !== null && t.client_branch !== undefined) continue;
    if (!t.client_id) continue;

    const cached = getCachedBranch(t.client_id);
    if (cached !== undefined) {
      cachedResults.set(t.client_id, cached);
    } else {
      uncachedIds.push(t.client_id);
    }
  }

  // Deduplicate
  const uniqueUncached = Array.from(new Set(uncachedIds));

  // Nothing to fetch from DB
  if (uniqueUncached.length === 0) {
    // Apply cached values only
    if (cachedResults.size === 0) return threads;

    return threads.map((t) => {
      if (t.client_branch !== null && t.client_branch !== undefined) return t;
      const branch = cachedResults.get(t.client_id);
      if (branch === undefined) return t;
      return { ...t, client_branch: branch };
    });
  }

  // Fetch from DB (limit to 500)
  const ids = uniqueUncached.slice(0, 500);

  const { data, error } = await supabase
    .from('clients')
    .select('id, branch')
    .in('id', ids);

  if (error) {
    console.warn('[hydrateClientBranches] Failed to hydrate branches:', error.message);
    // Still apply cached values
    return threads.map((t) => {
      if (t.client_branch !== null && t.client_branch !== undefined) return t;
      const branch = cachedResults.get(t.client_id);
      if (branch === undefined) return t;
      return { ...t, client_branch: branch };
    });
  }

  // Store fetched results in cache
  const fetchedMap = new Map<string, string | null>();
  (data || []).forEach((row: any) => {
    fetchedMap.set(row.id, row.branch ?? null);
  });
  setCachedBranches(fetchedMap);

  // Merge cached + fetched
  const allBranches = new Map([...cachedResults, ...fetchedMap]);

  return threads.map((t) => {
    if (t.client_branch !== null && t.client_branch !== undefined) return t;
    return {
      ...t,
      client_branch: allBranches.get(t.client_id) ?? null,
    };
  });
}
