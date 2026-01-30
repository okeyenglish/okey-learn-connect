/**
 * Image Cache Utility - Re-exports from mediaCache for backwards compatibility
 * @deprecated Use mediaCache.ts directly for new code
 */

export {
  cacheMedia as cacheImage,
  isMediaCached as isImageCached,
  getCachedMedia as getCachedImage,
  getMediaUrl as getImageUrl,
  preloadMedia as preloadImages,
  clearAllCaches as clearImageCache,
  getCacheStats as getImageCacheStats,
} from './mediaCache';

// Re-export types
export type { CacheStats } from './mediaCache';
