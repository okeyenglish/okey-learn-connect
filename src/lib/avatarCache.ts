/**
 * Shared in-memory avatar cache for client avatars.
 * Used by useClientAvatars hook and RealtimeAvatarsProvider.
 */

export interface AvatarCacheEntry {
  whatsapp?: string | null;
  telegram?: string | null;
  max?: string | null;
  fetchedAt: number;
}

// Global in-memory cache shared across all components
const avatarCache = new Map<string, AvatarCacheEntry>();

// Cache TTL: 30 minutes
export const AVATAR_CACHE_TTL = 30 * 60 * 1000;

/**
 * Get the global avatar cache Map
 */
export const getAvatarCache = () => avatarCache;

/**
 * Get cached avatar for a client
 */
export const getCachedAvatar = (
  clientId: string, 
  messenger: 'whatsapp' | 'telegram' | 'max'
): string | null => {
  const cached = avatarCache.get(clientId);
  if (cached && Date.now() - cached.fetchedAt < AVATAR_CACHE_TTL) {
    return cached[messenger] || null;
  }
  return null;
};

/**
 * Get any available avatar for a client (priority: telegram > whatsapp > max)
 */
export const getCachedAvatarAny = (clientId: string): string | null => {
  const cached = avatarCache.get(clientId);
  if (cached && Date.now() - cached.fetchedAt < AVATAR_CACHE_TTL) {
    return cached.telegram || cached.whatsapp || cached.max || null;
  }
  return null;
};

/**
 * Update avatar in cache
 */
export const updateAvatarCache = (
  clientId: string,
  updates: Partial<Omit<AvatarCacheEntry, 'fetchedAt'>>
) => {
  const existing = avatarCache.get(clientId) || { fetchedAt: Date.now() };
  
  if (updates.whatsapp !== undefined) {
    existing.whatsapp = updates.whatsapp;
  }
  if (updates.telegram !== undefined) {
    existing.telegram = updates.telegram;
  }
  if (updates.max !== undefined) {
    existing.max = updates.max;
  }
  existing.fetchedAt = Date.now();
  
  avatarCache.set(clientId, existing);
};

/**
 * Set full avatar entry in cache
 */
export const setAvatarCache = (clientId: string, entry: AvatarCacheEntry) => {
  avatarCache.set(clientId, entry);
};

/**
 * Delete avatar from cache
 */
export const deleteAvatarCache = (clientId: string) => {
  avatarCache.delete(clientId);
};

/**
 * Check if client has cached avatar
 */
export const hasAvatarCache = (clientId: string): boolean => {
  const cached = avatarCache.get(clientId);
  return !!cached && Date.now() - cached.fetchedAt < AVATAR_CACHE_TTL;
};
