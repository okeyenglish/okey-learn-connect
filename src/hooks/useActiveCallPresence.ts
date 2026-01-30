import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import type { PresenceType } from './useChatPresence';
import { useAuth } from '@/hooks/useAuth';

interface CallLogPayload {
  id: string;
  client_id: string | null;
  status: string;
  direction: string;
  manager_id: string | null;
  phone_number: string;
}

/**
 * Hook to track active calls and update presence to 'on_call'
 * Listens to call_logs realtime events and triggers presence updates
 */
export const useActiveCallPresence = (
  clientId: string | null,
  updatePresence: (targetClientId: string, type: PresenceType) => Promise<void>
) => {
  const { user } = useAuth();
  const currentUserIdRef = useRef<string | null>(null);
  const activeCallClientIdRef = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Sync current user ID from auth context
  useEffect(() => {
    currentUserIdRef.current = user?.id ?? null;
  }, [user?.id]);

  // Handle call status changes
  const handleCallEvent = useCallback((payload: { new?: CallLogPayload; old?: CallLogPayload; eventType: string }) => {
    const call = payload.new || payload.old;
    if (!call || !currentUserIdRef.current) return;

    // Only process calls where the current user is the manager
    if (call.manager_id !== currentUserIdRef.current) return;

    const callClientId = call.client_id;
    if (!callClientId) return;

    // Check if call is active (initiated or answered but not ended)
    const isActiveCall = call.status === 'initiated' || call.status === 'answered';
    const isEndedCall = ['missed', 'busy', 'failed', 'ended', 'completed'].includes(call.status);

    if (isActiveCall) {
      console.log('[useActiveCallPresence] Active call detected, setting on_call status');
      activeCallClientIdRef.current = callClientId;
      updatePresence(callClientId, 'on_call');
    } else if (isEndedCall && activeCallClientIdRef.current === callClientId) {
      console.log('[useActiveCallPresence] Call ended, reverting to viewing status');
      activeCallClientIdRef.current = null;
      // Revert to 'viewing' for current active chat
      if (clientId) {
        updatePresence(clientId, 'viewing');
      }
    }
  }, [clientId, updatePresence]);

  // Subscribe to call_logs changes
  useEffect(() => {
    if (!currentUserIdRef.current) return;

    const channelName = `active-call-presence-${currentUserIdRef.current}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_logs',
        },
        (payload) => handleCallEvent({ 
          new: payload.new as CallLogPayload, 
          eventType: 'INSERT' 
        })
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_logs',
        },
        (payload) => handleCallEvent({ 
          new: payload.new as CallLogPayload, 
          old: payload.old as CallLogPayload,
          eventType: 'UPDATE' 
        })
      )
      .subscribe((status) => {
        console.log(`[useActiveCallPresence] Subscription status: ${status}`);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [handleCallEvent]);

  return {
    setOnCall: useCallback((targetClientId: string) => {
      activeCallClientIdRef.current = targetClientId;
      updatePresence(targetClientId, 'on_call');
    }, [updatePresence]),
    
    setViewing: useCallback((targetClientId: string) => {
      activeCallClientIdRef.current = null;
      updatePresence(targetClientId, 'viewing');
    }, [updatePresence]),
  };
};
