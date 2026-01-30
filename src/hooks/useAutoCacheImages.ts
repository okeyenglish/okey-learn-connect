import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  cacheMedia, 
  isMediaCached, 
  detectMediaType, 
  getCacheStats,
  type MediaType,
  type CacheStats 
} from '@/lib/mediaCache';

interface MessageWithMedia {
  file_url?: string | null;
  file_type?: string | null;
  media_url?: string | null;
  media_type?: string | null;
  file_name?: string | null;
}

export interface MediaCacheProgress {
  /** Total media files found in chat */
  total: number;
  /** Number of files already cached */
  cached: number;
  /** Number of files currently being cached */
  inProgress: number;
  /** Whether caching is active */
  isActive: boolean;
  /** Percentage complete (0-100) */
  percentage: number;
  /** Breakdown by media type */
  byType: {
    images: { total: number; cached: number };
    videos: { total: number; cached: number };
    audio: { total: number; cached: number };
    documents: { total: number; cached: number };
  };
}

// Re-export for backwards compatibility
export type ImageCacheProgress = MediaCacheProgress;

interface MediaItem {
  url: string;
  type: MediaType;
  fileName?: string;
  priority: number; // Higher = cache first (more recent messages)
}

/**
 * Automatically caches media files from chat messages for offline viewing
 * Supports images, videos, audio, and documents
 * Returns progress information for UI display
 */
export function useAutoCacheImages(
  messages: MessageWithMedia[] | undefined,
  enabled: boolean = true
): MediaCacheProgress {
  const lastMessageCountRef = useRef<number>(0);
  const abortRef = useRef<boolean>(false);
  const cacheQueueRef = useRef<MediaItem[]>([]);
  
  const [progress, setProgress] = useState<MediaCacheProgress>({
    total: 0,
    cached: 0,
    inProgress: 0,
    isActive: false,
    percentage: 100,
    byType: {
      images: { total: 0, cached: 0 },
      videos: { total: 0, cached: 0 },
      audio: { total: 0, cached: 0 },
      documents: { total: 0, cached: 0 },
    },
  });

  const cacheMediaSequentially = useCallback(async (items: MediaItem[]) => {
    if (items.length === 0) return;
    
    setProgress(prev => ({
      ...prev,
      inProgress: items.length,
      isActive: true,
    }));

    let successCount = 0;
    const typeCounters = {
      images: 0,
      videos: 0,
      audio: 0,
      documents: 0,
    };
    
    // Process in batches of 2 for better performance
    const batchSize = 2;
    for (let i = 0; i < items.length; i += batchSize) {
      if (abortRef.current) break;
      
      const batch = items.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (item) => {
          try {
            const success = await cacheMedia(item.url, item.type, item.fileName);
            return { success, type: item.type };
          } catch (error) {
            console.warn('[AutoCache] Failed to cache:', item.url.substring(0, 50));
            return { success: false, type: item.type };
          }
        })
      );
      
      for (const result of results) {
        if (result.success) {
          successCount++;
          const typeKey = getTypeKey(result.type);
          if (typeKey) typeCounters[typeKey]++;
        }
      }
      
      setProgress(prev => {
        const newCached = prev.cached + results.filter(r => r.success).length;
        const remaining = items.length - i - batch.length;
        
        // Update type-specific counts
        const newByType = { ...prev.byType };
        for (const result of results) {
          if (result.success) {
            const key = getTypeKey(result.type);
            if (key && newByType[key]) {
              newByType[key] = {
                ...newByType[key],
                cached: newByType[key].cached + 1,
              };
            }
          }
        }
        
        return {
          ...prev,
          cached: newCached,
          inProgress: remaining,
          percentage: prev.total > 0 ? Math.round((newCached / prev.total) * 100) : 100,
          byType: newByType,
        };
      });
      
      // Small delay between batches to not overwhelm the network
      if (i + batchSize < items.length && !abortRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    setProgress(prev => ({
      ...prev,
      inProgress: 0,
      isActive: false,
    }));
    
    console.log(`[AutoCache] Completed: ${successCount}/${items.length} media files cached`);
  }, []);

  useEffect(() => {
    abortRef.current = false;
    
    if (!enabled || !messages || messages.length === 0) {
      setProgress({
        total: 0,
        cached: 0,
        inProgress: 0,
        isActive: false,
        percentage: 100,
        byType: {
          images: { total: 0, cached: 0 },
          videos: { total: 0, cached: 0 },
          audio: { total: 0, cached: 0 },
          documents: { total: 0, cached: 0 },
        },
      });
      return;
    }

    // Skip if we already processed these messages
    if (messages.length === lastMessageCountRef.current) return;
    lastMessageCountRef.current = messages.length;

    // Extract media URLs from messages with priority (recent = higher)
    const mediaItems: MediaItem[] = [];
    const byType = {
      images: { total: 0, cached: 0 },
      videos: { total: 0, cached: 0 },
      audio: { total: 0, cached: 0 },
      documents: { total: 0, cached: 0 },
    };
    
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const url = msg.file_url || msg.media_url;
      const mimeType = msg.file_type || msg.media_type;
      
      if (!url) continue;
      
      const type = detectMediaType(url, mimeType);
      if (type === 'unknown') continue;
      
      // Normalize URL (http -> https)
      const normalizedUrl = url.replace(/^http:\/\//i, 'https://');
      
      // Priority: more recent messages get higher priority
      const priority = i;
      
      mediaItems.push({
        url: normalizedUrl,
        type,
        fileName: msg.file_name || undefined,
        priority,
      });
      
      const typeKey = getTypeKey(type);
      if (typeKey) {
        byType[typeKey].total++;
      }
    }

    if (mediaItems.length === 0) {
      setProgress({
        total: 0,
        cached: 0,
        inProgress: 0,
        isActive: false,
        percentage: 100,
        byType,
      });
      return;
    }

    // Check cache status and start caching
    const processMedia = async () => {
      const uncachedItems: MediaItem[] = [];
      let alreadyCached = 0;
      const cachedByType = { ...byType };
      
      // Check which items are already cached
      for (const item of mediaItems) {
        const cached = await isMediaCached(item.url, item.type);
        if (cached) {
          alreadyCached++;
          const typeKey = getTypeKey(item.type);
          if (typeKey) {
            cachedByType[typeKey].cached++;
          }
        } else {
          uncachedItems.push(item);
        }
      }

      setProgress({
        total: mediaItems.length,
        cached: alreadyCached,
        inProgress: uncachedItems.length,
        isActive: uncachedItems.length > 0,
        percentage: mediaItems.length > 0 ? Math.round((alreadyCached / mediaItems.length) * 100) : 100,
        byType: cachedByType,
      });

      if (uncachedItems.length === 0) {
        console.log('[AutoCache] All media already cached');
        return;
      }

      // Sort by priority (recent first) and then by type (images first for faster perceived loading)
      const sorted = uncachedItems.sort((a, b) => {
        // Images first, then audio, then documents, then videos (largest)
        const typeOrder = { image: 0, audio: 1, document: 2, video: 3, unknown: 4 };
        const typeCompare = (typeOrder[a.type] || 4) - (typeOrder[b.type] || 4);
        if (typeCompare !== 0) return typeCompare;
        return b.priority - a.priority; // Higher priority (more recent) first
      });

      console.log(`[AutoCache] Starting to cache ${sorted.length} media files...`);
      cacheQueueRef.current = sorted;
      
      const requestIdle = (window as any).requestIdleCallback as
        | undefined
        | ((cb: () => void, opts?: { timeout?: number }) => void);

      // Use requestIdleCallback for background processing
      if (typeof requestIdle === 'function') {
        requestIdle(() => cacheMediaSequentially(sorted), { timeout: 10000 });
      } else {
        setTimeout(() => cacheMediaSequentially(sorted), 500);
      }
    };

    // Delay initial check to not interfere with render
    const timeoutId = setTimeout(processMedia, 500);

    return () => {
      clearTimeout(timeoutId);
      abortRef.current = true;
    };
  }, [messages, enabled, cacheMediaSequentially]);

  return progress;
}

function getTypeKey(type: MediaType): keyof MediaCacheProgress['byType'] | null {
  switch (type) {
    case 'image': return 'images';
    case 'video': return 'videos';
    case 'audio': return 'audio';
    case 'document': return 'documents';
    default: return null;
  }
}

/**
 * Hook to get overall cache statistics
 */
export function useMediaCacheStats() {
  const [stats, setStats] = useState<CacheStats | null>(null);

  useEffect(() => {
    const updateStats = () => {
      setStats(getCacheStats());
    };

    updateStats();
    
    // Update periodically
    const interval = setInterval(updateStats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return stats;
}

export default useAutoCacheImages;
