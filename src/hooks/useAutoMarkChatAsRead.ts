import { useEffect, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from './useAuth';

interface UseAutoMarkChatAsReadOptions {
  clientId: string | null;
  chatType: 'client' | 'corporate' | 'teachers' | 'communities' | null;
  isActive: boolean;
  /** Messenger type filter (optional) */
  messengerType?: string | null;
}

/**
 * Hook that automatically marks a chat as read when opened
 * with retry logic and fallback polling for reliability
 */
export const useAutoMarkChatAsRead = ({
  clientId,
  chatType,
  isActive,
  messengerType
}: UseAutoMarkChatAsReadOptions) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Track retry attempts
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const retryDelayMs = 2000;
  
  // Track if we've successfully marked this chat as read
  const markedAsReadRef = useRef<string | null>(null);
  
  // Polling interval for fallback sync
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalMs = 30000; // 30 seconds fallback polling

  // Mutation to mark chat as read
  const markAsReadMutation = useMutation({
    mutationFn: async ({ cId, messenger }: { cId: string; messenger?: string | null }) => {
      if (messenger) {
        // Mark only specific messenger type
        const { error } = await supabase.rpc('mark_chat_messages_as_read_by_messenger', {
          p_client_id: cId,
          p_messenger_type: messenger
        });
        if (error) throw error;
      } else {
        // Mark all messages for client
        const { error } = await supabase.rpc('mark_chat_messages_as_read', {
          p_client_id: cId
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, { cId }) => {
      console.log('[AutoMarkRead] Successfully marked chat as read:', cId);
      markedAsReadRef.current = cId;
      retryCountRef.current = 0;
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      queryClient.invalidateQueries({ queryKey: ['client-unread-by-messenger', cId] });
    },
    onError: (error, { cId }) => {
      console.error('[AutoMarkRead] Failed to mark as read:', error);
      
      // Retry logic
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        console.log(`[AutoMarkRead] Retrying... attempt ${retryCountRef.current}/${maxRetries}`);
        
        setTimeout(() => {
          markAsReadMutation.mutate({ cId, messenger: messengerType });
        }, retryDelayMs * retryCountRef.current);
      } else {
        console.warn('[AutoMarkRead] Max retries reached, will rely on polling fallback');
      }
    }
  });

  // Function to sync unread count
  const syncUnreadCount = useCallback(async () => {
    if (!clientId || !user || chatType !== 'client') return;
    
    try {
      // Refresh chat threads to sync counters
      await queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
      await queryClient.invalidateQueries({ queryKey: ['client-unread-by-messenger', clientId] });
      console.log('[AutoMarkRead] Polling sync completed');
    } catch (error) {
      console.error('[AutoMarkRead] Polling sync failed:', error);
    }
  }, [clientId, user, chatType, queryClient]);

  // DISABLED: Auto-mark as read when chat becomes active
  // Chats should only be marked as read:
  // 1. When explicitly marked via button
  // 2. When "Не требует ответа" is clicked
  // 3. When staff member replies in the chat
  // useEffect(() => {
  //   if (!isActive || !clientId || !user) return;
  //   if (chatType !== 'client') return;
  //   if (markedAsReadRef.current === clientId) return;
  //   retryCountRef.current = 0;
  //   const markTimeout = setTimeout(() => {
  //     markAsReadMutation.mutate({ cId: clientId, messenger: messengerType });
  //   }, 500);
  //   return () => clearTimeout(markTimeout);
  // }, [isActive, clientId, chatType, user, messengerType]);

  // Reset marked status when switching chats
  useEffect(() => {
    if (!clientId) {
      markedAsReadRef.current = null;
    }
  }, [clientId]);

  // Fallback polling for sync reliability
  useEffect(() => {
    if (!isActive || !clientId || chatType !== 'client') {
      // Clear polling when not active
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Start fallback polling
    pollingIntervalRef.current = setInterval(() => {
      syncUnreadCount();
    }, pollIntervalMs);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isActive, clientId, chatType, syncUnreadCount]);

  // Manual trigger for marking as read (e.g., on scroll to bottom)
  const markAsReadManually = useCallback(() => {
    if (!clientId || chatType !== 'client') return;
    
    markedAsReadRef.current = null; // Reset to allow re-marking
    retryCountRef.current = 0;
    markAsReadMutation.mutate({ cId: clientId, messenger: messengerType });
  }, [clientId, chatType, messengerType, markAsReadMutation]);

  // Force sync (useful after reconnection)
  const forceSync = useCallback(() => {
    syncUnreadCount();
    if (clientId && chatType === 'client') {
      markAsReadManually();
    }
  }, [syncUnreadCount, clientId, chatType, markAsReadManually]);

  return {
    isMarking: markAsReadMutation.isPending,
    markAsReadManually,
    forceSync
  };
};
