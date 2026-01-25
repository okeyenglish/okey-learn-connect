import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BulkFetchResponse {
  success: boolean;
  processed: number;
  updated: number;
  errors: string[];
}

// Track which clients we've already attempted to fetch
const attemptedClients = new Set<string>();

// Debounce timer
let debounceTimer: NodeJS.Timeout | null = null;
const pendingClientIds = new Set<string>();

/**
 * Hook to trigger background avatar fetching for clients without avatars
 */
export const useBulkAvatarFetch = () => {
  const isFetchingRef = useRef(false);

  const fetchAvatars = useCallback(async (clientIds: string[]) => {
    // Filter out already attempted clients
    const newClientIds = clientIds.filter(id => !attemptedClients.has(id));
    
    if (newClientIds.length === 0) return;

    // Mark as attempted to avoid duplicate requests
    newClientIds.forEach(id => attemptedClients.add(id));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      console.log(`[BulkAvatar] Triggering fetch for ${newClientIds.length} clients`);

      const response = await supabase.functions.invoke<BulkFetchResponse>('bulk-fetch-avatars', {
        body: { clientIds: newClientIds },
      });

      if (response.error) {
        console.error('[BulkAvatar] Error:', response.error);
        return;
      }

      console.log(`[BulkAvatar] Started processing ${response.data?.processed || 0} clients`);
    } catch (error) {
      console.error('[BulkAvatar] Failed to invoke function:', error);
    }
  }, []);

  /**
   * Queue clients for background avatar fetching with debouncing
   */
  const queueAvatarFetch = useCallback((clientIds: string[]) => {
    // Add to pending set
    clientIds.forEach(id => pendingClientIds.add(id));

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer to batch requests
    debounceTimer = setTimeout(() => {
      if (pendingClientIds.size > 0 && !isFetchingRef.current) {
        isFetchingRef.current = true;
        const ids = Array.from(pendingClientIds);
        pendingClientIds.clear();
        
        fetchAvatars(ids).finally(() => {
          isFetchingRef.current = false;
        });
      }
    }, 2000); // 2 second debounce
  }, [fetchAvatars]);

  /**
   * Check threads and queue avatar fetch for clients without avatars
   */
  const checkAndFetchMissingAvatars = useCallback((threads: Array<{
    client_id: string;
    whatsapp_avatar_url?: string | null;
    telegram_avatar_url?: string | null;
    max_avatar_url?: string | null;
    avatar_url?: string | null;
  }>) => {
    const clientsWithoutAvatars = threads
      .filter(t => 
        t.client_id && 
        !t.whatsapp_avatar_url && 
        !t.telegram_avatar_url && 
        !t.max_avatar_url &&
        !t.avatar_url
      )
      .map(t => t.client_id);

    if (clientsWithoutAvatars.length > 0) {
      queueAvatarFetch(clientsWithoutAvatars);
    }
  }, [queueAvatarFetch]);

  return {
    fetchAvatars,
    queueAvatarFetch,
    checkAndFetchMissingAvatars,
  };
};

/**
 * Reset attempted clients cache (useful for testing or manual refresh)
 */
export const resetAttemptedClients = () => {
  attemptedClients.clear();
};
