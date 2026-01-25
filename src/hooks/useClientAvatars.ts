import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { 
  getAvatarCache, 
  setAvatarCache, 
  updateAvatarCache, 
  deleteAvatarCache,
  AVATAR_CACHE_TTL,
  type AvatarCacheEntry 
} from '@/lib/avatarCache';

// Pending fetches to prevent duplicate requests
const pendingFetches = new Map<string, Promise<void>>();

export interface ClientAvatars {
  whatsapp: string | null;
  telegram: string | null;
  max: string | null;
}

export const useClientAvatars = (clientId: string | null) => {
  const queryClient = useQueryClient();
  const [avatars, setAvatars] = useState<ClientAvatars>({
    whatsapp: null,
    telegram: null,
    max: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);

  // Load avatars from cache or fetch from DB/API
  const loadAvatars = useCallback(async () => {
    if (!clientId) return;

    const avatarCache = getAvatarCache();

    // Check memory cache first
    const cached = avatarCache.get(clientId);
    if (cached && Date.now() - cached.fetchedAt < AVATAR_CACHE_TTL) {
      setAvatars({
        whatsapp: cached.whatsapp || null,
        telegram: cached.telegram || null,
        max: cached.max || null,
      });
      return;
    }

    // Check if fetch is already in progress
    if (pendingFetches.has(clientId)) {
      await pendingFetches.get(clientId);
      const freshCached = avatarCache.get(clientId);
      if (freshCached && mountedRef.current) {
        setAvatars({
          whatsapp: freshCached.whatsapp || null,
          telegram: freshCached.telegram || null,
          max: freshCached.max || null,
        });
      }
      return;
    }

    setIsLoading(true);

    const fetchPromise = (async () => {
      try {
        // Fetch all avatar URLs from DB first
        const { data: client } = await supabase
          .from('clients')
          .select('whatsapp_avatar_url, telegram_avatar_url, max_avatar_url')
          .eq('id', clientId)
          .maybeSingle();

        const newCache: AvatarCacheEntry = {
          whatsapp: client?.whatsapp_avatar_url || null,
          telegram: client?.telegram_avatar_url || null,
          max: client?.max_avatar_url || null,
          fetchedAt: Date.now(),
        };

        setAvatarCache(clientId, newCache);

        if (mountedRef.current) {
          setAvatars({
            whatsapp: newCache.whatsapp || null,
            telegram: newCache.telegram || null,
            max: newCache.max || null,
          });
        }
      } catch (error) {
        console.error('Error loading avatars:', error);
      } finally {
        pendingFetches.delete(clientId);
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    })();

    pendingFetches.set(clientId, fetchPromise);
    await fetchPromise;
  }, [clientId]);

  // Fetch avatar from external API and update cache
  const fetchExternalAvatar = useCallback(async (
    messenger: 'whatsapp' | 'telegram' | 'max',
    fetchFn: () => Promise<{ success: boolean; urlAvatar?: string; avatarUrl?: string }>
  ) => {
    if (!clientId) return null;

    const avatarCache = getAvatarCache();

    // Check cache first
    const cached = avatarCache.get(clientId);
    const cachedAvatar = cached?.[messenger];
    if (cachedAvatar) return cachedAvatar;

    try {
      const result = await fetchFn();
      const avatarUrl = result.urlAvatar || result.avatarUrl;
      
      if (result.success && avatarUrl) {
        // Update cache
        updateAvatarCache(clientId, { [messenger]: avatarUrl });

        // Update state
        if (mountedRef.current) {
          setAvatars(prev => ({ ...prev, [messenger]: avatarUrl }));
        }

        // Save to DB and force UI refresh
        const updateField = `${messenger}_avatar_url`;
        void (async () => {
          try {
            await supabase
              .from('clients')
              .update({ [updateField]: avatarUrl })
              .eq('id', clientId);
            
            // Force UI refresh: chat list (threads RPC) + client card queries
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['client', clientId] });
            queryClient.invalidateQueries({ queryKey: ['chat-threads-infinite'] });
            queryClient.invalidateQueries({ queryKey: ['chat-threads-unread-priority'] });
            queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
          } catch {
            // Ignore DB save errors - avatar is already in cache
          }
        })();

        return avatarUrl;
      }
    } catch (error) {
      console.error(`Error fetching ${messenger} avatar:`, error);
    }
    return null;
  }, [clientId, queryClient]);

  // Clear cache for client (e.g., on client change)
  const clearCache = useCallback(() => {
    if (clientId) {
      deleteAvatarCache(clientId);
    }
  }, [clientId]);

  // Update a specific avatar in cache
  const updateAvatar = useCallback((messenger: 'whatsapp' | 'telegram' | 'max', url: string) => {
    if (!clientId) return;
    
    updateAvatarCache(clientId, { [messenger]: url });
    setAvatars(prev => ({ ...prev, [messenger]: url }));
  }, [clientId]);

  useEffect(() => {
    mountedRef.current = true;
    loadAvatars();
    
    return () => {
      mountedRef.current = false;
    };
  }, [loadAvatars]);

  return {
    avatars,
    isLoading,
    fetchExternalAvatar,
    updateAvatar,
    clearCache,
    reloadAvatars: loadAvatars,
  };
};

// Utility to prefetch avatars for multiple clients
export const prefetchClientAvatars = async (clientIds: string[]) => {
  const avatarCache = getAvatarCache();
  const uncachedIds = clientIds.filter(id => !avatarCache.has(id));
  
  if (uncachedIds.length === 0) return;

  try {
    const { data: clients } = await supabase
      .from('clients')
      .select('id, whatsapp_avatar_url, telegram_avatar_url, max_avatar_url')
      .in('id', uncachedIds);

    clients?.forEach(client => {
      setAvatarCache(client.id, {
        whatsapp: client.whatsapp_avatar_url || null,
        telegram: client.telegram_avatar_url || null,
        max: client.max_avatar_url || null,
        fetchedAt: Date.now(),
      });
    });
  } catch (error) {
    console.error('Error prefetching avatars:', error);
  }
};

// Re-export from shared cache module
export { getCachedAvatar, getCachedAvatarAny } from '@/lib/avatarCache';
