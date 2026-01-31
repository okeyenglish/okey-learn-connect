/**
 * Unified hook for loading all chat dialog data in one request
 * Replaces: useChatMessagesOptimized + useClientAvatars + useClientUnreadByMessenger
 * 
 * Features:
 * - Single RPC call instead of 3-4 separate queries
 * - 5-minute in-memory cache for instant display
 * - Automatic fallback to legacy hooks if RPC not available
 * - Realtime subscription for automatic updates
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { ChatMessage } from './useChatMessages';
import { useCallback, useMemo, useRef, useEffect } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// In-memory cache for instant display
interface CacheEntry {
  data: ClientChatData;
  timestamp: number;
}

const clientChatCache = new Map<string, CacheEntry>();

// Cleanup old entries periodically
const cleanupCache = () => {
  const now = Date.now();
  for (const [key, entry] of clientChatCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      clientChatCache.delete(key);
    }
  }
};

// Run cleanup every minute
if (typeof window !== 'undefined') {
  setInterval(cleanupCache, 60 * 1000);
}

export interface ClientChatData {
  messages: ChatMessage[];
  hasMore: boolean;
  totalCount: number;
  unreadCounts: {
    whatsapp?: number;
    telegram?: number;
    max?: number;
    [key: string]: number | undefined;
  };
  avatars: {
    whatsapp: string | null;
    telegram: string | null;
    max: string | null;
  };
}

interface UseClientChatDataOptions {
  limit?: number;
  enabled?: boolean;
}

/**
 * Check if RPC function exists (cached result)
 */
let rpcAvailable: boolean | null = null;
let rpcCheckPromise: Promise<boolean> | null = null;

const checkRpcAvailable = async (): Promise<boolean> => {
  if (rpcAvailable !== null) return rpcAvailable;
  
  if (rpcCheckPromise) return rpcCheckPromise;
  
  rpcCheckPromise = (async () => {
    try {
      // Try calling with a non-existent UUID - if function exists, we get empty data
      // If function doesn't exist, we get an error
      const { error } = await supabase.rpc('get_client_chat_data', {
        p_client_id: '00000000-0000-0000-0000-000000000000',
        p_limit: 1
      });
      
      // Function exists if no "function does not exist" error
      rpcAvailable = !error?.message?.includes('function') && !error?.message?.includes('does not exist');
      console.log('[useClientChatData] RPC available:', rpcAvailable);
      return rpcAvailable;
    } catch {
      rpcAvailable = false;
      return false;
    }
  })();
  
  return rpcCheckPromise;
};

/**
 * Unified hook for chat data
 */
export const useClientChatData = (
  clientId: string | null,
  options: UseClientChatDataOptions = {}
) => {
  const { limit = 100, enabled = true } = options;
  const queryClient = useQueryClient();
  const fallbackModeRef = useRef(false);

  // Get cached data for instant display
  const cachedData = useMemo(() => {
    if (!clientId) return null;
    const cached = clientChatCache.get(clientId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    return null;
  }, [clientId]);

  const query = useQuery({
    queryKey: ['client-chat-data', clientId, limit],
    queryFn: async (): Promise<ClientChatData> => {
      if (!clientId) {
        return {
          messages: [],
          hasMore: false,
          totalCount: 0,
          unreadCounts: {},
          avatars: { whatsapp: null, telegram: null, max: null }
        };
      }

      const startTime = performance.now();

      // Check if RPC is available
      const useRpc = await checkRpcAvailable();

      if (useRpc && !fallbackModeRef.current) {
        try {
          // Try unified RPC call
          const { data, error } = await supabase.rpc('get_client_chat_data', {
            p_client_id: clientId,
            p_limit: limit
          });

          if (error) {
            console.warn('[useClientChatData] RPC error, falling back:', error.message);
            fallbackModeRef.current = true;
          } else if (data) {
            const result: ClientChatData = {
              messages: (data.messages || []) as ChatMessage[],
              hasMore: data.hasMore || false,
              totalCount: data.totalCount || 0,
              unreadCounts: data.unreadCounts || {},
              avatars: data.avatars || { whatsapp: null, telegram: null, max: null }
            };

            // Update cache
            clientChatCache.set(clientId, { data: result, timestamp: Date.now() });

            const duration = performance.now() - startTime;
            console.log(`[useClientChatData] ✅ RPC loaded in ${duration.toFixed(0)}ms (${result.messages.length} msgs)`);

            return result;
          }
        } catch (err) {
          console.warn('[useClientChatData] RPC failed, using fallback:', err);
          fallbackModeRef.current = true;
        }
      }

      // Fallback: separate queries (legacy mode)
      console.log('[useClientChatData] Using fallback mode (separate queries)');

      // 1. Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select(`
          id, client_id, message_text, message_type, system_type, is_read,
          created_at, file_url, file_name, file_type, external_message_id,
          messenger_type, call_duration, message_status, metadata
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(limit + 1);

      if (messagesError) {
        console.error('[useClientChatData] Messages query failed:', messagesError);
        throw messagesError;
      }

      const allMessages = messagesData || [];
      const hasMore = allMessages.length > limit;
      const messages = (hasMore ? allMessages.slice(0, limit) : allMessages).reverse() as ChatMessage[];

      // 2. Fetch unread counts
      const { data: unreadData } = await supabase
        .from('chat_messages')
        .select('messenger_type')
        .eq('client_id', clientId)
        .eq('is_read', false)
        .eq('message_type', 'client');

      const unreadCounts: Record<string, number> = {};
      (unreadData || []).forEach((msg: any) => {
        const type = msg.messenger_type || 'unknown';
        unreadCounts[type] = (unreadCounts[type] || 0) + 1;
      });

      // 3. Fetch avatars
      const { data: clientData } = await supabase
        .from('clients')
        .select('whatsapp_avatar_url, telegram_avatar_url, max_avatar_url')
        .eq('id', clientId)
        .maybeSingle();

      const avatars = {
        whatsapp: clientData?.whatsapp_avatar_url || null,
        telegram: clientData?.telegram_avatar_url || null,
        max: clientData?.max_avatar_url || null
      };

      const result: ClientChatData = {
        messages,
        hasMore,
        totalCount: messages.length,
        unreadCounts,
        avatars
      };

      // Update cache
      clientChatCache.set(clientId, { data: result, timestamp: Date.now() });

      const duration = performance.now() - startTime;
      console.log(`[useClientChatData] ⚠️ Fallback loaded in ${duration.toFixed(0)}ms`);

      return result;
    },
    enabled: enabled && !!clientId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    placeholderData: cachedData || undefined,
  });

  // Realtime subscription for automatic updates
  useEffect(() => {
    if (!clientId || !enabled) return;

    const channelName = `client-chat-realtime-${clientId}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `client_id=eq.${clientId}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          console.log('[useClientChatData] Realtime INSERT:', payload.new);
          
          const newMessage = payload.new as ChatMessage;
          
          // Update query cache with new message
          queryClient.setQueryData(
            ['client-chat-data', clientId, limit],
            (old: ClientChatData | undefined) => {
              if (!old) return old;
              
              // Check if message already exists (deduplication)
              const exists = old.messages.some(m => m.id === newMessage.id);
              if (exists) return old;
              
              // Add new message at the end (chronological order)
              const updatedMessages = [...old.messages, newMessage];
              
              // Update unread counts for incoming messages
              const updatedUnreadCounts = { ...old.unreadCounts };
              if (newMessage.message_type === 'client' && !newMessage.is_read) {
                const messengerType = newMessage.messenger_type || 'unknown';
                updatedUnreadCounts[messengerType] = (updatedUnreadCounts[messengerType] || 0) + 1;
              }
              
              // Update in-memory cache too
              clientChatCache.set(clientId, {
                data: { ...old, messages: updatedMessages, unreadCounts: updatedUnreadCounts },
                timestamp: Date.now()
              });
              
              return {
                ...old,
                messages: updatedMessages,
                totalCount: updatedMessages.length,
                unreadCounts: updatedUnreadCounts
              };
            }
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `client_id=eq.${clientId}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          console.log('[useClientChatData] Realtime UPDATE:', payload.new);
          
          const updatedMessage = payload.new as ChatMessage;
          
          queryClient.setQueryData(
            ['client-chat-data', clientId, limit],
            (old: ClientChatData | undefined) => {
              if (!old) return old;
              
              const updatedMessages = old.messages.map(msg =>
                msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg
              );
              
              // Recalculate unread counts if is_read changed
              const oldMsg = old.messages.find(m => m.id === updatedMessage.id);
              let updatedUnreadCounts = old.unreadCounts;
              
              if (oldMsg && oldMsg.is_read !== updatedMessage.is_read && updatedMessage.message_type === 'client') {
                updatedUnreadCounts = { ...old.unreadCounts };
                const messengerType = updatedMessage.messenger_type || 'unknown';
                
                if (updatedMessage.is_read && !oldMsg.is_read) {
                  // Message marked as read - decrease count
                  updatedUnreadCounts[messengerType] = Math.max(0, (updatedUnreadCounts[messengerType] || 1) - 1);
                } else if (!updatedMessage.is_read && oldMsg.is_read) {
                  // Message marked as unread - increase count
                  updatedUnreadCounts[messengerType] = (updatedUnreadCounts[messengerType] || 0) + 1;
                }
              }
              
              // Update in-memory cache
              clientChatCache.set(clientId, {
                data: { ...old, messages: updatedMessages, unreadCounts: updatedUnreadCounts },
                timestamp: Date.now()
              });
              
              return {
                ...old,
                messages: updatedMessages,
                unreadCounts: updatedUnreadCounts
              };
            }
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages',
          filter: `client_id=eq.${clientId}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          console.log('[useClientChatData] Realtime DELETE:', payload.old);
          
          const deletedId = (payload.old as { id?: string })?.id;
          if (!deletedId) return;
          
          queryClient.setQueryData(
            ['client-chat-data', clientId, limit],
            (old: ClientChatData | undefined) => {
              if (!old) return old;
              
              const deletedMsg = old.messages.find(m => m.id === deletedId);
              const updatedMessages = old.messages.filter(msg => msg.id !== deletedId);
              
              // Update unread counts if deleted message was unread
              let updatedUnreadCounts = old.unreadCounts;
              if (deletedMsg && !deletedMsg.is_read && deletedMsg.message_type === 'client') {
                updatedUnreadCounts = { ...old.unreadCounts };
                const messengerType = deletedMsg.messenger_type || 'unknown';
                updatedUnreadCounts[messengerType] = Math.max(0, (updatedUnreadCounts[messengerType] || 1) - 1);
              }
              
              // Update in-memory cache
              clientChatCache.set(clientId, {
                data: { ...old, messages: updatedMessages, unreadCounts: updatedUnreadCounts },
                timestamp: Date.now()
              });
              
              return {
                ...old,
                messages: updatedMessages,
                totalCount: updatedMessages.length,
                unreadCounts: updatedUnreadCounts
              };
            }
          );
        }
      )
      .subscribe((status) => {
        console.log(`[useClientChatData] Realtime subscription ${channelName}:`, status);
      });

    return () => {
      console.log(`[useClientChatData] Unsubscribing from ${channelName}`);
      supabase.removeChannel(channel);
    };
  }, [clientId, enabled, limit, queryClient]);

  // Invalidate cache when needed
  const invalidateCache = useCallback(() => {
    if (clientId) {
      clientChatCache.delete(clientId);
      queryClient.invalidateQueries({ queryKey: ['client-chat-data', clientId] });
    }
  }, [clientId, queryClient]);

  // Update specific avatar in cache
  const updateAvatarInCache = useCallback((
    messenger: 'whatsapp' | 'telegram' | 'max',
    url: string
  ) => {
    if (!clientId) return;
    
    const cached = clientChatCache.get(clientId);
    if (cached) {
      cached.data.avatars[messenger] = url;
      cached.timestamp = Date.now();
    }

    // Also update query cache
    queryClient.setQueryData(['client-chat-data', clientId, limit], (old: ClientChatData | undefined) => {
      if (!old) return old;
      return {
        ...old,
        avatars: { ...old.avatars, [messenger]: url }
      };
    });
  }, [clientId, limit, queryClient]);

  return {
    ...query,
    // Convenience accessors
    messages: query.data?.messages || [],
    hasMore: query.data?.hasMore || false,
    totalCount: query.data?.totalCount || 0,
    unreadCounts: query.data?.unreadCounts || {},
    avatars: query.data?.avatars || { whatsapp: null, telegram: null, max: null },
    // Actions
    invalidateCache,
    updateAvatarInCache,
    // Fallback mode indicator
    isFallbackMode: fallbackModeRef.current,
  };
};

/**
 * Prefetch client chat data on hover
 */
export const usePrefetchClientChatData = () => {
  const queryClient = useQueryClient();

  const prefetch = useCallback((clientId: string) => {
    if (!clientId) return;

    // Check if already fresh
    const existing = queryClient.getQueryState(['client-chat-data', clientId, 100]);
    if (existing?.dataUpdatedAt && Date.now() - existing.dataUpdatedAt < 30000) {
      return;
    }

    queryClient.prefetchQuery({
      queryKey: ['client-chat-data', clientId, 100],
      queryFn: async () => {
        // Use same logic as main hook
        const useRpc = await checkRpcAvailable();
        
        if (useRpc) {
          const { data } = await supabase.rpc('get_client_chat_data', {
            p_client_id: clientId,
            p_limit: 100
          });
          
          if (data) {
            return {
              messages: data.messages || [],
              hasMore: data.hasMore || false,
              totalCount: data.totalCount || 0,
              unreadCounts: data.unreadCounts || {},
              avatars: data.avatars || { whatsapp: null, telegram: null, max: null }
            };
          }
        }

        // Minimal fallback for prefetch
        const { data: msgs } = await supabase
          .from('chat_messages')
          .select('id, message_text, message_type, created_at, messenger_type')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(50);

        return {
          messages: (msgs || []).reverse(),
          hasMore: false,
          totalCount: msgs?.length || 0,
          unreadCounts: {},
          avatars: { whatsapp: null, telegram: null, max: null }
        };
      },
      staleTime: 30 * 1000,
    });
  }, [queryClient]);

  return { prefetch };
};

/**
 * Get cached data without triggering a fetch
 */
export const getCachedClientChatData = (clientId: string): ClientChatData | null => {
  const cached = clientChatCache.get(clientId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
};

/**
 * Clear all cached data
 */
export const clearClientChatCache = () => {
  clientChatCache.clear();
};
