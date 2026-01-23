/**
 * Edge Function Cache Utility
 * 
 * Provides two-level caching:
 * 1. In-memory cache (fast, within same instance)
 * 2. Database cache (persistent, cross-instance)
 * 
 * Usage:
 * ```typescript
 * import { EdgeCache } from '../_shared/cache.ts';
 * 
 * const cache = new EdgeCache(supabase);
 * 
 * // Get or set with async factory
 * const data = await cache.getOrSet('my-key', async () => {
 *   return await expensiveDbQuery();
 * }, { ttlSeconds: 300 });
 * ```
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface CacheOptions {
  ttlSeconds?: number;
  useDbCache?: boolean;
}

// In-memory cache (shared within single Edge Runtime instance)
const memoryCache = new Map<string, CacheEntry<unknown>>();

// Cleanup expired entries periodically
const cleanupInterval = 60000; // 1 minute
let lastCleanup = Date.now();

function cleanupExpired(): void {
  const now = Date.now();
  if (now - lastCleanup < cleanupInterval) return;
  
  lastCleanup = now;
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt < now) {
      memoryCache.delete(key);
    }
  }
}

export class EdgeCache {
  private supabase: SupabaseClient | null;
  private prefix: string;

  constructor(supabase?: SupabaseClient, prefix: string = 'cache') {
    this.supabase = supabase || null;
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  /**
   * Get value from cache (memory first, then DB)
   */
  async get<T>(key: string): Promise<T | null> {
    cleanupExpired();
    const cacheKey = this.getKey(key);
    const now = Date.now();

    // Check memory cache first
    const memEntry = memoryCache.get(cacheKey) as CacheEntry<T> | undefined;
    if (memEntry && memEntry.expiresAt > now) {
      console.log(`[EdgeCache] Memory HIT: ${key}`);
      return memEntry.value;
    }

    // Check database cache
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('cache_entries')
          .select('value, expires_at')
          .eq('key', cacheKey)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (!error && data) {
          console.log(`[EdgeCache] DB HIT: ${key}`);
          // Populate memory cache
          const value = data.value as T;
          memoryCache.set(cacheKey, {
            value,
            expiresAt: new Date(data.expires_at).getTime(),
          });
          return value;
        }
      } catch (e) {
        console.log(`[EdgeCache] DB cache error:`, e);
      }
    }

    console.log(`[EdgeCache] MISS: ${key}`);
    return null;
  }

  /**
   * Set value in cache (both memory and DB)
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const { ttlSeconds = 300, useDbCache = true } = options;
    const cacheKey = this.getKey(key);
    const expiresAt = Date.now() + ttlSeconds * 1000;

    // Set in memory cache
    memoryCache.set(cacheKey, { value, expiresAt });
    console.log(`[EdgeCache] SET: ${key} (TTL: ${ttlSeconds}s)`);

    // Set in database cache for persistence
    if (useDbCache && this.supabase) {
      try {
        await this.supabase
          .from('cache_entries')
          .upsert({
            key: cacheKey,
            value,
            expires_at: new Date(expiresAt).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'key' });
      } catch (e) {
        // DB cache is optional, don't fail
        console.log(`[EdgeCache] DB write error:`, e);
      }
    }
  }

  /**
   * Get or set with async factory function
   * This is the main API for caching expensive operations
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Invalidate a specific key
   */
  async invalidate(key: string): Promise<void> {
    const cacheKey = this.getKey(key);
    memoryCache.delete(cacheKey);

    if (this.supabase) {
      try {
        await this.supabase
          .from('cache_entries')
          .delete()
          .eq('key', cacheKey);
      } catch (e) {
        console.log(`[EdgeCache] Invalidate error:`, e);
      }
    }
    console.log(`[EdgeCache] INVALIDATED: ${key}`);
  }

  /**
   * Invalidate all keys matching a pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    const fullPattern = this.getKey(pattern);
    
    // Clear from memory
    for (const key of memoryCache.keys()) {
      if (key.startsWith(fullPattern)) {
        memoryCache.delete(key);
      }
    }

    // Clear from DB
    if (this.supabase) {
      try {
        await this.supabase
          .from('cache_entries')
          .delete()
          .like('key', `${fullPattern}%`);
      } catch (e) {
        console.log(`[EdgeCache] Invalidate pattern error:`, e);
      }
    }
    console.log(`[EdgeCache] INVALIDATED PATTERN: ${pattern}*`);
  }

  /**
   * Get cache statistics
   */
  getStats(): { memorySize: number; keys: string[] } {
    return {
      memorySize: memoryCache.size,
      keys: Array.from(memoryCache.keys()),
    };
  }
}

/**
 * Create a simple hash for cache keys from objects
 */
export function hashKey(obj: unknown): string {
  const str = JSON.stringify(obj);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Pre-configured cache instances for common use cases
 */
export const CacheTTL = {
  SHORT: 60,        // 1 minute - for frequently changing data
  MEDIUM: 300,      // 5 minutes - default
  LONG: 900,        // 15 minutes - for stable data
  HOUR: 3600,       // 1 hour - for rarely changing data
  DAY: 86400,       // 24 hours - for static data
} as const;
