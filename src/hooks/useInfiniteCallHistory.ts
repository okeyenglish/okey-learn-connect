import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { selfHostedPost } from "@/lib/selfHostedApi";
import { useEffect, useCallback, useState, useRef } from "react";
import { toast } from "sonner";
import type { CallLog } from "./useCallHistory";

interface CallLogsResponse {
  success: boolean;
  calls: CallLog[];
  total: number;
  hasMore?: boolean;
}

interface CachedCallData {
  pages: { calls: CallLog[]; nextOffset: number | null; total: number }[];
  timestamp: number;
  clientId: string;
}

const PAGE_SIZE = 20;
const CACHE_KEY_PREFIX = 'call-history-cache-';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHED_CLIENTS = 50; // Limit cached clients to prevent storage bloat

// Get cached data from localStorage
const getCachedData = (clientId: string): CachedCallData | null => {
  try {
    const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${clientId}`);
    if (!cached) return null;
    
    const data: CachedCallData = JSON.parse(cached);
    
    // Check if cache is still valid
    if (Date.now() - data.timestamp > CACHE_TTL) {
      localStorage.removeItem(`${CACHE_KEY_PREFIX}${clientId}`);
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
};

// Save data to localStorage cache
const setCachedData = (clientId: string, pages: CachedCallData['pages']) => {
  try {
    // Clean up old caches if too many
    cleanupOldCaches();
    
    const data: CachedCallData = {
      pages,
      timestamp: Date.now(),
      clientId
    };
    localStorage.setItem(`${CACHE_KEY_PREFIX}${clientId}`, JSON.stringify(data));
  } catch (e) {
    // Storage might be full, try to clean up
    console.warn('[CallHistory] Cache write failed:', e);
    cleanupOldCaches(true);
  }
};

// Remove old caches to prevent storage bloat
const cleanupOldCaches = (force = false) => {
  try {
    const cacheKeys: { key: string; timestamp: number }[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_KEY_PREFIX)) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          cacheKeys.push({ key, timestamp: data.timestamp || 0 });
        } catch {
          // Invalid cache, remove it
          localStorage.removeItem(key);
        }
      }
    }
    
    // Sort by timestamp (oldest first)
    cacheKeys.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove oldest caches if we have too many or if forced
    const removeCount = force ? Math.ceil(cacheKeys.length / 2) : Math.max(0, cacheKeys.length - MAX_CACHED_CLIENTS);
    for (let i = 0; i < removeCount; i++) {
      localStorage.removeItem(cacheKeys[i].key);
    }
  } catch {
    // Ignore cleanup errors
  }
};

export const useInfiniteCallHistory = (clientId: string) => {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const wasOfflineRef = useRef(!navigator.onLine);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('[CallHistory] Connection restored');
      setIsOnline(true);
      
      // If we were offline, trigger sync after a short delay
      if (wasOfflineRef.current && clientId) {
        wasOfflineRef.current = false;
        
        // Debounce sync to avoid multiple rapid calls
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }
        
        syncTimeoutRef.current = setTimeout(() => {
          setIsSyncing(true);
          queryClient.invalidateQueries({ queryKey: ['call-logs-infinite', clientId] })
            .then(() => {
              toast.success('История звонков синхронизирована');
            })
            .catch(() => {
              toast.error('Не удалось синхронизировать звонки');
            })
            .finally(() => {
              setIsSyncing(false);
            });
        }, 1000);
      }
    };
    
    const handleOffline = () => {
      console.log('[CallHistory] Connection lost');
      setIsOnline(false);
      wasOfflineRef.current = true;
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [clientId, queryClient]);
  
  // Initialize with cached data if available
  useEffect(() => {
    if (!clientId) return;
    
    const cached = getCachedData(clientId);
    if (cached && cached.pages.length > 0) {
      // Pre-populate query cache with offline data
      queryClient.setQueryData(['call-logs-infinite', clientId], {
        pages: cached.pages,
        pageParams: cached.pages.map((_, i) => i * PAGE_SIZE)
      });
      console.log('[CallHistory] Loaded from cache:', clientId, cached.pages.length, 'pages');
    }
  }, [clientId, queryClient]);

  const query = useInfiniteQuery({
    queryKey: ['call-logs-infinite', clientId],
    queryFn: async ({ pageParam = 0 }): Promise<{ calls: CallLog[]; nextOffset: number | null; total: number }> => {
      const response = await selfHostedPost<CallLogsResponse>('get-call-logs', {
        action: 'history',
        clientId,
        limit: PAGE_SIZE,
        offset: pageParam
      });

      if (!response.success) {
        throw new Error(response.error || 'Ошибка загрузки звонков');
      }

      const calls = response.data?.calls || [];
      const total = response.data?.total || 0;
      const hasMore = response.data?.hasMore ?? (pageParam + calls.length < total);

      return {
        calls,
        nextOffset: hasMore ? pageParam + PAGE_SIZE : null,
        total
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    enabled: !!clientId && isOnline, // Only fetch when online
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
    refetchOnReconnect: true, // Refetch when reconnecting
    retry: 2,
    // Use cached data while fetching
    placeholderData: (previousData) => previousData,
  });

  // Persist successful fetches to localStorage
  useEffect(() => {
    if (query.data && query.data.pages.length > 0 && !query.isFetching) {
      setCachedData(clientId, query.data.pages);
    }
  }, [clientId, query.data, query.isFetching]);

  // Check if we're using cached/offline data
  const isOfflineData = useCallback(() => {
    if (!query.data) return false;
    const cached = getCachedData(clientId);
    return (cached !== null && query.isError) || !isOnline;
  }, [clientId, query.data, query.isError, isOnline]);

  // Manual sync function
  const syncNow = useCallback(async () => {
    if (!isOnline) {
      toast.error('Нет подключения к интернету');
      return;
    }
    
    setIsSyncing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['call-logs-infinite', clientId] });
      toast.success('История звонков синхронизирована');
    } catch {
      toast.error('Не удалось синхронизировать звонки');
    } finally {
      setIsSyncing(false);
    }
  }, [clientId, isOnline, queryClient]);

  return {
    ...query,
    isOfflineData: isOfflineData(),
    isOnline,
    isSyncing,
    syncNow,
  };
};

// Hook to clear all call history cache
export const useClearCallHistoryCache = () => {
  return useCallback(() => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log('[CallHistory] Cache cleared:', keysToRemove.length, 'entries');
  }, []);
};
