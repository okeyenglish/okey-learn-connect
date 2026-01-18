import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const CACHE_PREFIX = 'chat_cache_';
const CACHE_VERSION = 'v1';
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_MESSAGES_PER_CLIENT = 100;
const MAX_CACHED_CLIENTS = 50;

interface CachedMessage {
  id: string;
  client_id: string;
  message_text: string;
  created_at: string;
  is_outgoing: boolean | null;
  messenger_type: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
}

interface CacheEntry {
  version: string;
  timestamp: number;
  messages: CachedMessage[];
}

interface CacheMetadata {
  version: string;
  lastCleanup: number;
  clients: { id: string; lastAccess: number }[];
}

/**
 * Hook for offline message caching using localStorage
 * - Caches recent messages per client
 * - Auto-cleanup of old entries
 * - LRU eviction when cache is full
 * - Syncs with React Query cache
 */
export const useOfflineMessageCache = () => {
  const queryClient = useQueryClient();
  const cleanupScheduledRef = useRef(false);

  // Get cache key for a client
  const getCacheKey = useCallback((clientId: string) => {
    return `${CACHE_PREFIX}${CACHE_VERSION}_${clientId}`;
  }, []);

  // Get metadata key
  const getMetadataKey = useCallback(() => {
    return `${CACHE_PREFIX}metadata`;
  }, []);

  // Read from cache
  const readFromCache = useCallback((clientId: string): CachedMessage[] | null => {
    try {
      const key = getCacheKey(clientId);
      const cached = localStorage.getItem(key);
      
      if (!cached) return null;
      
      const entry: CacheEntry = JSON.parse(cached);
      
      // Check version and age
      if (entry.version !== CACHE_VERSION) {
        localStorage.removeItem(key);
        return null;
      }
      
      if (Date.now() - entry.timestamp > MAX_CACHE_AGE_MS) {
        localStorage.removeItem(key);
        return null;
      }
      
      return entry.messages;
    } catch (error) {
      console.warn('[OfflineCache] Failed to read cache:', error);
      return null;
    }
  }, [getCacheKey]);

  // Write to cache
  const writeToCache = useCallback((clientId: string, messages: CachedMessage[]) => {
    try {
      const key = getCacheKey(clientId);
      
      // Limit messages per client
      const limitedMessages = messages.slice(0, MAX_MESSAGES_PER_CLIENT);
      
      const entry: CacheEntry = {
        version: CACHE_VERSION,
        timestamp: Date.now(),
        messages: limitedMessages.map(msg => ({
          id: msg.id,
          client_id: msg.client_id,
          message_text: msg.message_text,
          created_at: msg.created_at,
          is_outgoing: msg.is_outgoing,
          messenger_type: msg.messenger_type,
          file_url: msg.file_url,
          file_name: msg.file_name,
          file_type: msg.file_type,
        })),
      };
      
      localStorage.setItem(key, JSON.stringify(entry));
      updateMetadata(clientId);
    } catch (error) {
      console.warn('[OfflineCache] Failed to write cache:', error);
      // If storage is full, try cleanup
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        cleanupOldEntries();
      }
    }
  }, [getCacheKey]);

  // Update metadata with LRU tracking
  const updateMetadata = useCallback((clientId: string) => {
    try {
      const key = getMetadataKey();
      const cached = localStorage.getItem(key);
      let metadata: CacheMetadata;
      
      if (cached) {
        metadata = JSON.parse(cached);
      } else {
        metadata = {
          version: CACHE_VERSION,
          lastCleanup: Date.now(),
          clients: [],
        };
      }
      
      // Update or add client
      const existingIndex = metadata.clients.findIndex(c => c.id === clientId);
      if (existingIndex >= 0) {
        metadata.clients[existingIndex].lastAccess = Date.now();
      } else {
        metadata.clients.push({ id: clientId, lastAccess: Date.now() });
      }
      
      // Sort by last access (most recent first)
      metadata.clients.sort((a, b) => b.lastAccess - a.lastAccess);
      
      // Evict oldest if over limit
      if (metadata.clients.length > MAX_CACHED_CLIENTS) {
        const toRemove = metadata.clients.slice(MAX_CACHED_CLIENTS);
        toRemove.forEach(client => {
          localStorage.removeItem(getCacheKey(client.id));
        });
        metadata.clients = metadata.clients.slice(0, MAX_CACHED_CLIENTS);
      }
      
      localStorage.setItem(key, JSON.stringify(metadata));
    } catch (error) {
      console.warn('[OfflineCache] Failed to update metadata:', error);
    }
  }, [getMetadataKey, getCacheKey]);

  // Cleanup old entries
  const cleanupOldEntries = useCallback(() => {
    try {
      const now = Date.now();
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(CACHE_PREFIX)) continue;
        if (key === getMetadataKey()) continue;
        
        try {
          const cached = localStorage.getItem(key);
          if (!cached) continue;
          
          const entry: CacheEntry = JSON.parse(cached);
          
          if (entry.version !== CACHE_VERSION || now - entry.timestamp > MAX_CACHE_AGE_MS) {
            keysToRemove.push(key);
          }
        } catch {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`[OfflineCache] Cleaned up ${keysToRemove.length} old entries`);
    } catch (error) {
      console.warn('[OfflineCache] Cleanup failed:', error);
    }
  }, [getMetadataKey]);

  // Clear all cache
  const clearAllCache = useCallback(() => {
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`[OfflineCache] Cleared ${keysToRemove.length} cache entries`);
    } catch (error) {
      console.warn('[OfflineCache] Clear failed:', error);
    }
  }, []);

  // Get cache stats
  const getCacheStats = useCallback(() => {
    try {
      let totalSize = 0;
      let entryCount = 0;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
          const value = localStorage.getItem(key);
          if (value) {
            totalSize += value.length * 2; // Approximate size in bytes (UTF-16)
            entryCount++;
          }
        }
      }
      
      return {
        entryCount,
        totalSizeKB: Math.round(totalSize / 1024),
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      };
    } catch {
      return { entryCount: 0, totalSizeKB: 0, totalSizeMB: '0' };
    }
  }, []);

  // Schedule cleanup on mount
  useEffect(() => {
    if (!cleanupScheduledRef.current) {
      cleanupScheduledRef.current = true;
      // Delay cleanup to not block initial render
      setTimeout(cleanupOldEntries, 5000);
    }
  }, [cleanupOldEntries]);

  // Hydrate React Query cache from localStorage on mount
  const hydrateFromCache = useCallback((clientId: string) => {
    const cached = readFromCache(clientId);
    if (cached && cached.length > 0) {
      console.log(`[OfflineCache] Hydrating ${cached.length} messages for client ${clientId}`);
      queryClient.setQueryData(['chat-messages', clientId], (old: any) => {
        if (old && old.length > 0) return old; // Don't overwrite if we have fresh data
        return cached;
      });
      return cached;
    }
    return null;
  }, [readFromCache, queryClient]);

  return {
    readFromCache,
    writeToCache,
    clearAllCache,
    getCacheStats,
    hydrateFromCache,
    cleanupOldEntries,
  };
};

export default useOfflineMessageCache;
