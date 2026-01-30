import { supabase } from '@/integrations/supabase/typedClient';

/**
 * Centralized auth helpers to eliminate duplicate getUser() calls.
 * 
 * Instead of calling supabase.auth.getUser() in every mutation (50+ calls),
 * we cache the userId with a TTL and sync with AuthProvider.
 */

let cachedUserId: string | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached userId for mutation functions.
 * Falls back to getUser() if cache is stale.
 * 
 * For React hooks, prefer using useAuth().user instead.
 */
export const getCachedUserId = async (): Promise<string | null> => {
  const now = Date.now();
  if (cachedUserId && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedUserId;
  }
  
  const { data: { user } } = await supabase.auth.getUser();
  cachedUserId = user?.id ?? null;
  cacheTimestamp = now;
  return cachedUserId;
};

/**
 * Set the cached userId - called by AuthProvider on auth state changes.
 * This eliminates the need for getUser() calls entirely when AuthProvider is active.
 */
export const setCachedUserId = (userId: string | null) => {
  cachedUserId = userId;
  cacheTimestamp = Date.now();
};

/**
 * Clear auth cache on logout.
 */
export const clearAuthCache = () => {
  cachedUserId = null;
  cacheTimestamp = 0;
};

/**
 * Get current cached userId synchronously (may be null if not yet set).
 * Useful for checking if user is logged in without async call.
 */
export const getCachedUserIdSync = (): string | null => {
  return cachedUserId;
};
