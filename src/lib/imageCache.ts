/**
 * Image Cache Utility for offline viewing
 * Uses Cache API for persistent storage across sessions
 */

const IMAGE_CACHE_NAME = 'chat-images-v1';
const MAX_CACHE_SIZE = 100; // Maximum number of images to cache
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheMetadata {
  url: string;
  cachedAt: number;
  size?: number;
}

/**
 * Get or create the image cache
 */
async function getImageCache(): Promise<Cache | null> {
  try {
    if (!('caches' in window)) {
      console.warn('[ImageCache] Cache API not supported');
      return null;
    }
    return await caches.open(IMAGE_CACHE_NAME);
  } catch (error) {
    console.error('[ImageCache] Failed to open cache:', error);
    return null;
  }
}

/**
 * Cache an image for offline viewing
 */
export async function cacheImage(url: string): Promise<boolean> {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) {
    return false;
  }

  try {
    const cache = await getImageCache();
    if (!cache) return false;

    // Check if already cached
    const existing = await cache.match(url);
    if (existing) {
      console.log('[ImageCache] Already cached:', url.substring(0, 50));
      return true;
    }

    // Fetch with no-cors for external images
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
    }).catch(() => 
      // Fallback to no-cors if CORS fails
      fetch(url, { mode: 'no-cors' })
    );

    if (!response) {
      console.warn('[ImageCache] Failed to fetch:', url.substring(0, 50));
      return false;
    }

    // Clone response before caching
    await cache.put(url, response.clone());
    console.log('[ImageCache] Cached:', url.substring(0, 50));

    // Update metadata in localStorage
    updateCacheMetadata(url);

    // Cleanup old entries if needed
    await cleanupCache();

    return true;
  } catch (error) {
    console.warn('[ImageCache] Failed to cache image:', error);
    return false;
  }
}

/**
 * Get a cached image
 */
export async function getCachedImage(url: string): Promise<Response | null> {
  try {
    const cache = await getImageCache();
    if (!cache) return null;

    const response = await cache.match(url);
    if (response) {
      console.log('[ImageCache] Cache hit:', url.substring(0, 50));
      return response;
    }
    return null;
  } catch (error) {
    console.warn('[ImageCache] Failed to get cached image:', error);
    return null;
  }
}

/**
 * Check if an image is cached
 */
export async function isImageCached(url: string): Promise<boolean> {
  try {
    const cache = await getImageCache();
    if (!cache) return false;

    const response = await cache.match(url);
    return !!response;
  } catch {
    return false;
  }
}

/**
 * Get image URL (from cache or network)
 * Returns a blob URL if cached, otherwise the original URL
 */
export async function getImageUrl(url: string): Promise<string> {
  try {
    const cachedResponse = await getCachedImage(url);
    if (cachedResponse) {
      const blob = await cachedResponse.blob();
      return URL.createObjectURL(blob);
    }
    return url;
  } catch {
    return url;
  }
}

/**
 * Update cache metadata in localStorage
 */
function updateCacheMetadata(url: string): void {
  try {
    const metadataKey = 'image_cache_metadata';
    const existing = localStorage.getItem(metadataKey);
    let metadata: CacheMetadata[] = existing ? JSON.parse(existing) : [];

    // Remove existing entry for this URL
    metadata = metadata.filter(m => m.url !== url);

    // Add new entry
    metadata.push({
      url,
      cachedAt: Date.now(),
    });

    // Keep only last MAX_CACHE_SIZE entries
    if (metadata.length > MAX_CACHE_SIZE) {
      metadata = metadata.slice(-MAX_CACHE_SIZE);
    }

    localStorage.setItem(metadataKey, JSON.stringify(metadata));
  } catch (error) {
    console.warn('[ImageCache] Failed to update metadata:', error);
  }
}

/**
 * Get cache metadata from localStorage
 */
function getCacheMetadata(): CacheMetadata[] {
  try {
    const metadataKey = 'image_cache_metadata';
    const existing = localStorage.getItem(metadataKey);
    return existing ? JSON.parse(existing) : [];
  } catch {
    return [];
  }
}

/**
 * Cleanup old cached images
 */
async function cleanupCache(): Promise<void> {
  try {
    const cache = await getImageCache();
    if (!cache) return;

    const metadata = getCacheMetadata();
    const now = Date.now();

    // Find expired entries
    const expiredUrls = metadata
      .filter(m => now - m.cachedAt > MAX_CACHE_AGE_MS)
      .map(m => m.url);

    // Find entries to remove if over limit
    if (metadata.length > MAX_CACHE_SIZE) {
      const toRemove = metadata
        .sort((a, b) => a.cachedAt - b.cachedAt)
        .slice(0, metadata.length - MAX_CACHE_SIZE)
        .map(m => m.url);
      expiredUrls.push(...toRemove);
    }

    // Remove from cache
    for (const url of expiredUrls) {
      await cache.delete(url);
    }

    // Update metadata
    if (expiredUrls.length > 0) {
      const updatedMetadata = metadata.filter(m => !expiredUrls.includes(m.url));
      localStorage.setItem('image_cache_metadata', JSON.stringify(updatedMetadata));
      console.log('[ImageCache] Cleaned up', expiredUrls.length, 'entries');
    }
  } catch (error) {
    console.warn('[ImageCache] Cleanup failed:', error);
  }
}

/**
 * Clear all cached images
 */
export async function clearImageCache(): Promise<void> {
  try {
    if ('caches' in window) {
      await caches.delete(IMAGE_CACHE_NAME);
    }
    localStorage.removeItem('image_cache_metadata');
    console.log('[ImageCache] Cache cleared');
  } catch (error) {
    console.error('[ImageCache] Failed to clear cache:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getImageCacheStats(): Promise<{
  count: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}> {
  const metadata = getCacheMetadata();
  
  if (metadata.length === 0) {
    return { count: 0, oldestEntry: null, newestEntry: null };
  }

  const sorted = [...metadata].sort((a, b) => a.cachedAt - b.cachedAt);
  
  return {
    count: metadata.length,
    oldestEntry: new Date(sorted[0].cachedAt),
    newestEntry: new Date(sorted[sorted.length - 1].cachedAt),
  };
}

/**
 * Preload multiple images into cache
 */
export async function preloadImages(urls: string[]): Promise<number> {
  let cached = 0;
  
  // Filter valid URLs
  const validUrls = urls.filter(url => 
    url && 
    !url.startsWith('data:') && 
    !url.startsWith('blob:') &&
    (url.startsWith('http') || url.startsWith('/'))
  );

  // Cache in parallel with limit
  const batchSize = 3;
  for (let i = 0; i < validUrls.length; i += batchSize) {
    const batch = validUrls.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(url => cacheImage(url)));
    cached += results.filter(Boolean).length;
  }

  return cached;
}
