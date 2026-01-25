import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { RealtimeChannel } from '@supabase/supabase-js';

interface AvatarCache {
  whatsapp?: string | null;
  telegram?: string | null;
  max?: string | null;
  fetchedAt: number;
}

interface ClientAvatarPayload {
  id: string;
  whatsapp_avatar_url?: string | null;
  telegram_avatar_url?: string | null;
  max_avatar_url?: string | null;
}

// In-memory cache shared across all hook instances
const avatarCache = new Map<string, AvatarCache>();
const pendingFetches = new Map<string, Promise<void>>();

// Global realtime channel for avatar updates
let realtimeChannel: RealtimeChannel | null = null;
let realtimeSubscribers = new Set<(clientId: string, avatars: Partial<AvatarCache>) => void>();

// Initialize global realtime subscription
const initRealtimeSubscription = () => {
  if (realtimeChannel) return;

  realtimeChannel = supabase
    .channel('clients-avatar-changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'clients',
      },
      (payload) => {
        const newData = payload.new as ClientAvatarPayload;
        const oldData = payload.old as ClientAvatarPayload;
        
        // Check if any avatar field changed
        const avatarChanged = 
          newData.whatsapp_avatar_url !== oldData.whatsapp_avatar_url ||
          newData.telegram_avatar_url !== oldData.telegram_avatar_url ||
          newData.max_avatar_url !== oldData.max_avatar_url;
        
        if (avatarChanged && newData.id) {
          console.log('[AvatarRealtime] Avatar updated for client:', newData.id);
          
          // Update in-memory cache
          const existing = avatarCache.get(newData.id) || { fetchedAt: Date.now() };
          if (newData.whatsapp_avatar_url !== undefined) {
            existing.whatsapp = newData.whatsapp_avatar_url;
          }
          if (newData.telegram_avatar_url !== undefined) {
            existing.telegram = newData.telegram_avatar_url;
          }
          if (newData.max_avatar_url !== undefined) {
            existing.max = newData.max_avatar_url;
          }
          existing.fetchedAt = Date.now();
          avatarCache.set(newData.id, existing);
          
          // Notify all subscribers
          const updates: Partial<AvatarCache> = {
            whatsapp: newData.whatsapp_avatar_url,
            telegram: newData.telegram_avatar_url,
            max: newData.max_avatar_url,
          };
          realtimeSubscribers.forEach(callback => callback(newData.id, updates));
        }
      }
    )
    .subscribe((status) => {
      console.log('[AvatarRealtime] Channel status:', status);
    });
};

// Cleanup when no more subscribers
const cleanupRealtimeSubscription = () => {
  if (realtimeSubscribers.size === 0 && realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
    console.log('[AvatarRealtime] Channel removed');
  }
};

// Cache TTL: 30 minutes
const CACHE_TTL = 30 * 60 * 1000;

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

    // Check memory cache first
    const cached = avatarCache.get(clientId);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
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

        const newCache: AvatarCache = {
          whatsapp: client?.whatsapp_avatar_url || null,
          telegram: client?.telegram_avatar_url || null,
          max: client?.max_avatar_url || null,
          fetchedAt: Date.now(),
        };

        avatarCache.set(clientId, newCache);

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

    // Check cache first
    const cached = avatarCache.get(clientId);
    const cachedAvatar = cached?.[messenger];
    if (cachedAvatar) return cachedAvatar;

    try {
      const result = await fetchFn();
      const avatarUrl = result.urlAvatar || result.avatarUrl;
      
      if (result.success && avatarUrl) {
        // Update cache
        const existing = avatarCache.get(clientId) || { fetchedAt: Date.now() };
        existing[messenger] = avatarUrl;
        existing.fetchedAt = Date.now();
        avatarCache.set(clientId, existing);

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
      avatarCache.delete(clientId);
    }
  }, [clientId]);

  // Update a specific avatar in cache
  const updateAvatar = useCallback((messenger: 'whatsapp' | 'telegram' | 'max', url: string) => {
    if (!clientId) return;
    
    const existing = avatarCache.get(clientId) || { fetchedAt: Date.now() };
    existing[messenger] = url;
    avatarCache.set(clientId, existing);
    
    setAvatars(prev => ({ ...prev, [messenger]: url }));
  }, [clientId]);

  // Realtime subscription for avatar updates
  useEffect(() => {
    if (!clientId) return;

    // Initialize global realtime channel
    initRealtimeSubscription();

    // Subscribe to updates for this client
    const handleAvatarUpdate = (updatedClientId: string, updates: Partial<AvatarCache>) => {
      if (updatedClientId === clientId && mountedRef.current) {
        setAvatars(prev => ({
          whatsapp: updates.whatsapp !== undefined ? updates.whatsapp || null : prev.whatsapp,
          telegram: updates.telegram !== undefined ? updates.telegram || null : prev.telegram,
          max: updates.max !== undefined ? updates.max || null : prev.max,
        }));
        
        // Invalidate React Query cache for immediate UI refresh
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        queryClient.invalidateQueries({ queryKey: ['client', clientId] });
        queryClient.invalidateQueries({ queryKey: ['chat-threads-infinite'] });
        queryClient.invalidateQueries({ queryKey: ['chat-threads-unread-priority'] });
        queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      }
    };

    realtimeSubscribers.add(handleAvatarUpdate);

    return () => {
      realtimeSubscribers.delete(handleAvatarUpdate);
      cleanupRealtimeSubscription();
    };
  }, [clientId, queryClient]);

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
  const uncachedIds = clientIds.filter(id => !avatarCache.has(id));
  
  if (uncachedIds.length === 0) return;

  try {
    const { data: clients } = await supabase
      .from('clients')
      .select('id, whatsapp_avatar_url, telegram_avatar_url, max_avatar_url')
      .in('id', uncachedIds);

    clients?.forEach(client => {
      avatarCache.set(client.id, {
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

// Get avatar from cache (synchronous)
export const getCachedAvatar = (clientId: string, messenger: 'whatsapp' | 'telegram' | 'max'): string | null => {
  const cached = avatarCache.get(clientId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached[messenger] || null;
  }
  return null;
};
