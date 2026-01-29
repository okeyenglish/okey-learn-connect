import { useEffect, useRef } from 'react';
import { preloadImages, isImageCached } from '@/lib/imageCache';

interface MessageWithMedia {
  file_url?: string | null;
  file_type?: string | null;
  media_url?: string | null;
  media_type?: string | null;
}

/**
 * Automatically caches images from chat messages for offline viewing
 * Runs in background when messages are loaded
 */
export function useAutoCacheImages(
  messages: MessageWithMedia[] | undefined,
  enabled: boolean = true
) {
  const cachedClientRef = useRef<string | null>(null);
  const lastMessageCountRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled || !messages || messages.length === 0) return;

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

    if (imageUrls.length === 0) return;

    // Cache images in background (don't block UI)
    const cacheImagesInBackground = async () => {
      // Filter out already cached images first
      const uncachedUrls: string[] = [];
      
      for (const url of imageUrls) {
        const cached = await isImageCached(url);
        if (!cached) {
          uncachedUrls.push(url);
        }
      }

      if (uncachedUrls.length === 0) {
        console.log('[AutoCache] All images already cached');
        return;
      }

      console.log(`[AutoCache] Caching ${uncachedUrls.length} images in background...`);
      
      // Use requestIdleCallback for true background processing
      const cacheWithIdle = () => {
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(
            async () => {
              const cached = await preloadImages(uncachedUrls);
              console.log(`[AutoCache] Cached ${cached}/${uncachedUrls.length} images`);
            },
            { timeout: 5000 }
          );
        } else {
          // Fallback for Safari/iOS
          setTimeout(async () => {
            const cached = await preloadImages(uncachedUrls);
            console.log(`[AutoCache] Cached ${cached}/${uncachedUrls.length} images`);
          }, 1000);
        }
      };

      cacheWithIdle();
    };

    // Delay caching to not interfere with initial render
    const timeoutId = setTimeout(cacheImagesInBackground, 500);

    return () => clearTimeout(timeoutId);
  }, [messages, enabled]);
}

export default useAutoCacheImages;
