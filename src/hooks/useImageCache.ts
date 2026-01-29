import { useEffect, useCallback, useState } from 'react';
import { cacheImage, isImageCached, getImageUrl, preloadImages } from '@/lib/imageCache';

interface UseImageCacheOptions {
  /** Auto-cache the image when it loads */
  autoCache?: boolean;
}

/**
 * Hook for caching individual images
 */
export function useImageCache(url: string | undefined, options: UseImageCacheOptions = {}) {
  const { autoCache = true } = options;
  const [isCached, setIsCached] = useState(false);
  const [cachedUrl, setCachedUrl] = useState<string | undefined>(url);
  const [isLoading, setIsLoading] = useState(false);

  // Check if image is cached on mount
  useEffect(() => {
    if (!url) {
      setIsCached(false);
      setCachedUrl(undefined);
      return;
    }

    let mounted = true;

    const checkCache = async () => {
      const cached = await isImageCached(url);
      if (mounted) {
        setIsCached(cached);
        if (cached) {
          const blobUrl = await getImageUrl(url);
          setCachedUrl(blobUrl);
        } else {
          setCachedUrl(url);
        }
      }
    };

    checkCache();

    return () => {
      mounted = false;
    };
  }, [url]);

  // Cache the image
  const cache = useCallback(async () => {
    if (!url || isCached) return false;

    setIsLoading(true);
    try {
      const success = await cacheImage(url);
      if (success) {
        setIsCached(true);
        const blobUrl = await getImageUrl(url);
        setCachedUrl(blobUrl);
      }
      return success;
    } finally {
      setIsLoading(false);
    }
  }, [url, isCached]);

  // Handle image load event - auto-cache if enabled
  const onLoad = useCallback(() => {
    if (autoCache && url && !isCached) {
      cacheImage(url).then(success => {
        if (success) setIsCached(true);
      });
    }
  }, [autoCache, url, isCached]);

  return {
    /** Whether the image is cached */
    isCached,
    /** URL to use (blob URL if cached, original otherwise) */
    cachedUrl,
    /** Whether caching is in progress */
    isLoading,
    /** Manually trigger caching */
    cache,
    /** Callback to attach to onLoad */
    onLoad,
  };
}

/**
 * Hook for caching multiple images (e.g., gallery images)
 */
export function useImageGalleryCache(urls: string[]) {
  const [cachedCount, setCachedCount] = useState(0);
  const [isPreloading, setIsPreloading] = useState(false);
  const [cachedUrls, setCachedUrls] = useState<Map<string, string>>(new Map());

  // Check which images are cached on mount
  useEffect(() => {
    if (urls.length === 0) return;

    let mounted = true;

    const checkCached = async () => {
      let count = 0;
      const urlMap = new Map<string, string>();

      for (const url of urls) {
        if (!url) continue;
        const cached = await isImageCached(url);
        if (cached) {
          count++;
          const blobUrl = await getImageUrl(url);
          urlMap.set(url, blobUrl);
        } else {
          urlMap.set(url, url);
        }
      }

      if (mounted) {
        setCachedCount(count);
        setCachedUrls(urlMap);
      }
    };

    checkCached();

    return () => {
      mounted = false;
    };
  }, [urls.join(',')]);

  // Preload all images
  const preloadAll = useCallback(async () => {
    if (urls.length === 0 || isPreloading) return 0;

    setIsPreloading(true);
    try {
      const count = await preloadImages(urls);
      setCachedCount(prev => prev + count);

      // Update cached URLs
      const urlMap = new Map<string, string>();
      for (const url of urls) {
        if (!url) continue;
        const cached = await isImageCached(url);
        if (cached) {
          const blobUrl = await getImageUrl(url);
          urlMap.set(url, blobUrl);
        } else {
          urlMap.set(url, url);
        }
      }
      setCachedUrls(urlMap);

      return count;
    } finally {
      setIsPreloading(false);
    }
  }, [urls, isPreloading]);

  // Get cached URL for a specific image
  const getCachedUrl = useCallback((url: string) => {
    return cachedUrls.get(url) || url;
  }, [cachedUrls]);

  return {
    /** Number of cached images */
    cachedCount,
    /** Total number of images */
    totalCount: urls.length,
    /** Whether preloading is in progress */
    isPreloading,
    /** Preload all images */
    preloadAll,
    /** Get cached URL for a specific image */
    getCachedUrl,
    /** Map of original URL to cached URL */
    cachedUrls,
  };
}

export default useImageCache;
