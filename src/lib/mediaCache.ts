/**
 * Media Cache Utility for offline viewing
 * Supports images, videos, audio, and documents
 * Uses Cache API for persistent storage across sessions
 */

// Cache names for different media types
const CACHE_NAMES = {
  images: 'chat-media-images-v2',
  videos: 'chat-media-videos-v1',
  audio: 'chat-media-audio-v1',
  documents: 'chat-media-documents-v1',
} as const;

// Cache limits (in MB)
const CACHE_LIMITS = {
  images: 200,      // 200MB for images
  videos: 500,      // 500MB for videos
  audio: 100,       // 100MB for audio
  documents: 50,    // 50MB for documents
  total: 800,       // 800MB total
} as const;

const MAX_CACHE_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const METADATA_KEY = 'media_cache_metadata_v2';

export type MediaType = 'image' | 'video' | 'audio' | 'document' | 'unknown';

interface CacheEntry {
  url: string;
  type: MediaType;
  cachedAt: number;
  size: number;
  fileName?: string;
}

interface CacheMetadata {
  entries: CacheEntry[];
  totalSize: number;
  lastCleanup: number;
}

/**
 * Detect media type from URL and MIME type
 */
export function detectMediaType(url: string, mimeType?: string | null): MediaType {
  const lower = (mimeType || '').toLowerCase();
  
  if (lower.startsWith('image/')) return 'image';
  if (lower.startsWith('video/')) return 'video';
  if (lower.startsWith('audio/')) return 'audio';
  if (lower.includes('pdf') || lower.includes('document')) return 'document';
  
  // Try from URL extension
  const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase();
  if (!ext) return 'unknown';
  
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico'];
  const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv', '3gp'];
  const audioExts = ['mp3', 'wav', 'ogg', 'opus', 'm4a', 'aac', 'flac'];
  const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
  
  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  if (audioExts.includes(ext)) return 'audio';
  if (docExts.includes(ext)) return 'document';
  
  return 'unknown';
}

/**
 * Get cache name for media type
 */
function getCacheName(type: MediaType): string {
  switch (type) {
    case 'image': return CACHE_NAMES.images;
    case 'video': return CACHE_NAMES.videos;
    case 'audio': return CACHE_NAMES.audio;
    case 'document': return CACHE_NAMES.documents;
    default: return CACHE_NAMES.images; // Fallback
  }
}

/**
 * Get or create cache for media type
 */
async function getCache(type: MediaType): Promise<Cache | null> {
  try {
    if (!('caches' in window)) {
      console.warn('[MediaCache] Cache API not supported');
      return null;
    }
    return await caches.open(getCacheName(type));
  } catch (error) {
    console.error('[MediaCache] Failed to open cache:', error);
    return null;
  }
}

/**
 * Get metadata from localStorage
 */
function getMetadata(): CacheMetadata {
  try {
    const data = localStorage.getItem(METADATA_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch {
    // Ignore
  }
  return { entries: [], totalSize: 0, lastCleanup: 0 };
}

/**
 * Save metadata to localStorage
 */
function saveMetadata(metadata: CacheMetadata): void {
  try {
    localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
  } catch (error) {
    console.warn('[MediaCache] Failed to save metadata:', error);
  }
}

/**
 * Estimate available storage
 */
export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
  usagePercent: number;
}> {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      return {
        usage,
        quota,
        usagePercent: quota > 0 ? Math.round((usage / quota) * 100) : 0,
      };
    }
  } catch {
    // Ignore
  }
  return { usage: 0, quota: 0, usagePercent: 0 };
}

/**
 * Cache a media file
 */
export async function cacheMedia(
  url: string,
  type?: MediaType,
  fileName?: string
): Promise<boolean> {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) {
    return false;
  }

  const mediaType = type || detectMediaType(url);
  if (mediaType === 'unknown') {
    console.warn('[MediaCache] Unknown media type for:', url.substring(0, 50));
    return false;
  }

  try {
    const cache = await getCache(mediaType);
    if (!cache) return false;

    // Check if already cached
    const existing = await cache.match(url);
    if (existing) {
      return true;
    }

    // Fetch the media
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
    }).catch(() =>
      fetch(url, { mode: 'no-cors' })
    );

    if (!response) {
      console.warn('[MediaCache] Failed to fetch:', url.substring(0, 50));
      return false;
    }

    // Get size from response
    const contentLength = response.headers.get('content-length');
    const size = contentLength ? parseInt(contentLength, 10) : 0;

    // Clone and cache
    await cache.put(url, response.clone());

    // Update metadata
    const metadata = getMetadata();
    metadata.entries = metadata.entries.filter(e => e.url !== url);
    metadata.entries.push({
      url,
      type: mediaType,
      cachedAt: Date.now(),
      size,
      fileName,
    });
    metadata.totalSize += size;
    saveMetadata(metadata);

    console.log(`[MediaCache] Cached ${mediaType}:`, url.substring(0, 50));

    // Schedule cleanup if needed
    scheduleCleanup();

    return true;
  } catch (error) {
    console.warn('[MediaCache] Failed to cache:', error);
    return false;
  }
}

/**
 * Check if media is cached
 */
export async function isMediaCached(url: string, type?: MediaType): Promise<boolean> {
  try {
    const mediaType = type || detectMediaType(url);
    const cache = await getCache(mediaType);
    if (!cache) return false;

    const response = await cache.match(url);
    return !!response;
  } catch {
    return false;
  }
}

/**
 * Get cached media
 */
export async function getCachedMedia(url: string, type?: MediaType): Promise<Response | null> {
  try {
    const mediaType = type || detectMediaType(url);
    const cache = await getCache(mediaType);
    if (!cache) return null;

    return await cache.match(url);
  } catch {
    return null;
  }
}

/**
 * Get media URL (from cache or network)
 */
export async function getMediaUrl(url: string, type?: MediaType): Promise<string> {
  try {
    const cachedResponse = await getCachedMedia(url, type);
    if (cachedResponse) {
      const blob = await cachedResponse.blob();
      return URL.createObjectURL(blob);
    }
    return url;
  } catch {
    return url;
  }
}

let cleanupScheduled = false;

/**
 * Schedule cleanup (debounced)
 */
function scheduleCleanup(): void {
  if (cleanupScheduled) return;
  cleanupScheduled = true;

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      cleanupCache();
      cleanupScheduled = false;
    }, { timeout: 30000 });
  } else {
    setTimeout(() => {
      cleanupCache();
      cleanupScheduled = false;
    }, 10000);
  }
}

/**
 * Cleanup old/excess cached media
 */
export async function cleanupCache(): Promise<number> {
  const metadata = getMetadata();
  const now = Date.now();

  // Skip if recently cleaned
  if (now - metadata.lastCleanup < 60 * 60 * 1000) {
    return 0;
  }

  let removed = 0;
  const toRemove: CacheEntry[] = [];

  // Find expired entries
  for (const entry of metadata.entries) {
    if (now - entry.cachedAt > MAX_CACHE_AGE_MS) {
      toRemove.push(entry);
    }
  }

  // If still over limit, remove oldest by type
  const totalLimitBytes = CACHE_LIMITS.total * 1024 * 1024;
  if (metadata.totalSize > totalLimitBytes) {
    const sorted = [...metadata.entries]
      .filter(e => !toRemove.includes(e))
      .sort((a, b) => a.cachedAt - b.cachedAt);

    let currentSize = metadata.totalSize - toRemove.reduce((s, e) => s + e.size, 0);
    
    for (const entry of sorted) {
      if (currentSize <= totalLimitBytes * 0.8) break;
      toRemove.push(entry);
      currentSize -= entry.size;
    }
  }

  // Remove from caches
  for (const entry of toRemove) {
    try {
      const cache = await getCache(entry.type);
      if (cache) {
        await cache.delete(entry.url);
        removed++;
      }
    } catch {
      // Ignore
    }
  }

  // Update metadata
  const removedUrls = new Set(toRemove.map(e => e.url));
  metadata.entries = metadata.entries.filter(e => !removedUrls.has(e.url));
  metadata.totalSize = metadata.entries.reduce((s, e) => s + e.size, 0);
  metadata.lastCleanup = now;
  saveMetadata(metadata);

  if (removed > 0) {
    console.log(`[MediaCache] Cleaned up ${removed} entries`);
  }

  return removed;
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  try {
    if ('caches' in window) {
      await Promise.all(
        Object.values(CACHE_NAMES).map(name => caches.delete(name))
      );
    }
    localStorage.removeItem(METADATA_KEY);
    console.log('[MediaCache] All caches cleared');
  } catch (error) {
    console.error('[MediaCache] Failed to clear caches:', error);
  }
}

/**
 * Get cache statistics
 */
export interface CacheStats {
  totalCount: number;
  totalSize: number;
  totalSizeMB: number;
  byType: {
    [key in MediaType]?: {
      count: number;
      size: number;
      sizeMB: number;
    };
  };
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

export function getCacheStats(): CacheStats {
  const metadata = getMetadata();
  
  const byType: CacheStats['byType'] = {};
  
  for (const entry of metadata.entries) {
    if (!byType[entry.type]) {
      byType[entry.type] = { count: 0, size: 0, sizeMB: 0 };
    }
    byType[entry.type]!.count++;
    byType[entry.type]!.size += entry.size;
    byType[entry.type]!.sizeMB = Math.round(byType[entry.type]!.size / 1024 / 1024 * 10) / 10;
  }

  const sorted = [...metadata.entries].sort((a, b) => a.cachedAt - b.cachedAt);

  return {
    totalCount: metadata.entries.length,
    totalSize: metadata.totalSize,
    totalSizeMB: Math.round(metadata.totalSize / 1024 / 1024 * 10) / 10,
    byType,
    oldestEntry: sorted.length > 0 ? new Date(sorted[0].cachedAt) : null,
    newestEntry: sorted.length > 0 ? new Date(sorted[sorted.length - 1].cachedAt) : null,
  };
}

/**
 * Preload multiple media files with priority
 */
export async function preloadMedia(
  items: Array<{ url: string; type?: MediaType; priority?: number }>,
  onProgress?: (cached: number, total: number) => void
): Promise<number> {
  if (items.length === 0) return 0;

  // Sort by priority (higher first)
  const sorted = [...items].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  
  let cached = 0;
  const batchSize = 3;

  for (let i = 0; i < sorted.length; i += batchSize) {
    const batch = sorted.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(item => cacheMedia(item.url, item.type))
    );
    cached += results.filter(Boolean).length;
    onProgress?.(cached, sorted.length);
    
    // Small delay between batches
    if (i + batchSize < sorted.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  return cached;
}

// Re-export for backwards compatibility with imageCache
export {
  cacheMedia as cacheImage,
  isMediaCached as isImageCached,
  getCachedMedia as getCachedImage,
  getMediaUrl as getImageUrl,
  preloadMedia as preloadImages,
};
