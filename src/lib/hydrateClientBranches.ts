import { supabase } from '@/integrations/supabase/typedClient';
import type { ChatThread } from '@/hooks/useChatMessages';

/**
 * Hydrates missing `client_branch` values on threads by querying the `clients` table.
 *
 * Why: some RPC functions on self-hosted environments don't return `client_branch`,
 * which makes branch filtering and manager restrictions behave like "all or nothing".
 * This helper makes the UI resilient by filling missing branches on the frontend.
 */
export async function hydrateClientBranches(threads: ChatThread[]): Promise<ChatThread[]> {
  if (!threads || threads.length === 0) return threads;

  const missingIds = Array.from(
    new Set(
      threads
        .filter((t) => !!t.client_id && (t.client_branch === null || t.client_branch === undefined))
        .map((t) => t.client_id)
        .filter(Boolean)
    )
  );

  // Nothing to hydrate
  if (missingIds.length === 0) return threads;

  // Protect from huge IN queries (shouldn't happen because pages are small)
  const ids = missingIds.slice(0, 500);

  const { data, error } = await supabase
    .from('clients')
    .select('id, branch')
    .in('id', ids);

  if (error) {
    console.warn('[hydrateClientBranches] Failed to hydrate branches:', error.message);
    return threads;
  }

  const branchById = new Map<string, string | null>();
  (data || []).forEach((row: any) => {
    branchById.set(row.id, row.branch ?? null);
  });

  const hydrated = threads.map((t) => {
    if (t.client_branch !== null && t.client_branch !== undefined) return t;
    return {
      ...t,
      client_branch: branchById.get(t.client_id) ?? null,
    };
  });

  return hydrated;
}
