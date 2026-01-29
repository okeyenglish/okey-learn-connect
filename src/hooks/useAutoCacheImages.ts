import { useEffect, useRef, useState, useCallback } from 'react';
import { cacheImage, isImageCached } from '@/lib/imageCache';

interface MessageWithMedia {
  file_url?: string | null;
  file_type?: string | null;
  media_url?: string | null;
  media_type?: string | null;
}

export interface ImageCacheProgress {
  /** Total images found in chat */
  total: number;
  /** Number of images already cached */
  cached: number;
  /** Number of images currently being cached */
  inProgress: number;
  /** Whether caching is active */
  isActive: boolean;
  /** Percentage complete (0-100) */
  percentage: number;
}

/**
 * Automatically caches images from chat messages for offline viewing
 * Returns progress information for UI display
 */
export function useAutoCacheImages(
  messages: MessageWithMedia[] | undefined,
  enabled: boolean = true
): ImageCacheProgress {
  const lastMessageCountRef = useRef<number>(0);
  const abortRef = useRef<boolean>(false);
  
  const [progress, setProgress] = useState<ImageCacheProgress>({
    total: 0,
    cached: 0,
    inProgress: 0,
    isActive: false,
    percentage: 100,
  });

  const cacheImagesSequentially = useCallback(async (urls: string[]) => {
    if (urls.length === 0) return;
    
    setProgress(prev => ({
      ...prev,
      inProgress: urls.length,
      isActive: true,
    }));

    let successCount = 0;
    
    for (let i = 0; i < urls.length; i++) {
      if (abortRef.current) break;
      
      const url = urls[i];
      try {
        const success = await cacheImage(url);
        if (success) successCount++;
        
        setProgress(prev => {
          const newCached = prev.cached + (success ? 1 : 0);
          const remaining = urls.length - i - 1;
          return {
            ...prev,
            cached: newCached,
            inProgress: remaining,
            percentage: prev.total > 0 ? Math.round((newCached / prev.total) * 100) : 100,
          };
        });
        
        // Small delay between requests to not overwhelm the network
        if (i < urls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.warn('[AutoCache] Failed to cache:', url);
      }
    }
    
    setProgress(prev => ({
      ...prev,
      inProgress: 0,
      isActive: false,
    }));
    
    console.log(`[AutoCache] Completed: ${successCount}/${urls.length} images cached`);
  }, []);

  useEffect(() => {
    abortRef.current = false;
    
    if (!enabled || !messages || messages.length === 0) {
      setProgress({ total: 0, cached: 0, inProgress: 0, isActive: false, percentage: 100 });
      return;
    }

    // Skip if we already processed these messages
    if (messages.length === lastMessageCountRef.current) return;
    lastMessageCountRef.current = messages.length;

    // Extract image URLs from messages
    const imageUrls: string[] = [];
    
    for (const msg of messages) {
      const url = msg.file_url || msg.media_url;
      const type = msg.file_type || msg.media_type;
      
      if (!url) continue;
      
      // Check if it's an image
      const isImage = 
        type?.startsWith('image/') ||
        /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(url);
      
      if (isImage) {
        // Normalize URL (http -> https)
        const normalizedUrl = url.replace(/^http:\/\//i, 'https://');
        imageUrls.push(normalizedUrl);
      }
    }

    if (imageUrls.length === 0) {
      setProgress({ total: 0, cached: 0, inProgress: 0, isActive: false, percentage: 100 });
      return;
    }

    // Check cache status and start caching
    const processImages = async () => {
      const uncachedUrls: string[] = [];
      let alreadyCached = 0;
      
      for (const url of imageUrls) {
        const cached = await isImageCached(url);
        if (cached) {
          alreadyCached++;
        } else {
          uncachedUrls.push(url);
        }
      }

      setProgress({
        total: imageUrls.length,
        cached: alreadyCached,
        inProgress: uncachedUrls.length,
        isActive: uncachedUrls.length > 0,
        percentage: imageUrls.length > 0 ? Math.round((alreadyCached / imageUrls.length) * 100) : 100,
      });

      if (uncachedUrls.length === 0) {
        console.log('[AutoCache] All images already cached');
        return;
      }

      console.log(`[AutoCache] Starting to cache ${uncachedUrls.length} images...`);
      
      // Use requestIdleCallback for background processing
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(
          () => cacheImagesSequentially(uncachedUrls),
          { timeout: 5000 }
        );
      } else {
        setTimeout(() => cacheImagesSequentially(uncachedUrls), 500);
      }
    };

    // Delay initial check to not interfere with render
    const timeoutId = setTimeout(processImages, 300);

    return () => {
      clearTimeout(timeoutId);
      abortRef.current = true;
    };
  }, [messages, enabled, cacheImagesSequentially]);

  return progress;
}

export default useAutoCacheImages;
