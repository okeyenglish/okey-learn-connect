import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';

interface CallLogPayload {
  id: string;
  client_id: string | null;
  status: string;
  direction: string;
  phone_number: string;
}

/**
 * Hook for realtime updates of call logs
 * Subscribes to postgres_changes on call_logs table and invalidates relevant queries
 * when new missed calls arrive
 */
export const useCallLogsRealtime = (clientId?: string) => {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    // Create unique channel name
    const channelName = clientId 
      ? `call-logs-realtime-${clientId}` 
      : 'call-logs-realtime-global';

    console.log(`[useCallLogsRealtime] Subscribing to ${channelName}`);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_logs',
          ...(clientId && { filter: `client_id=eq.${clientId}` }),
        },
        (payload) => {
          const newCall = payload.new as CallLogPayload;
          console.log('[useCallLogsRealtime] New call received:', {
            id: newCall.id,
            status: newCall.status,
            direction: newCall.direction,
            clientId: newCall.client_id,
          });

          // Invalidate queries for the affected client
          if (newCall.client_id) {
            queryClient.invalidateQueries({ 
              queryKey: ['client-unread-by-messenger', newCall.client_id] 
            });
            queryClient.invalidateQueries({ 
              queryKey: ['unviewed-missed-calls', newCall.client_id] 
            });
            queryClient.invalidateQueries({ 
              queryKey: ['call-logs', newCall.client_id] 
            });
          }

          // If status is 'missed', also invalidate global counts
          if (newCall.status === 'missed') {
            console.log('[useCallLogsRealtime] Missed call detected, refreshing UI');
            
            // Dispatch custom event for components that need immediate update
            window.dispatchEvent(new CustomEvent('missed-call-received', {
              detail: {
                callId: newCall.id,
                clientId: newCall.client_id,
                phoneNumber: newCall.phone_number,
              }
            }));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_logs',
          ...(clientId && { filter: `client_id=eq.${clientId}` }),
        },
        (payload) => {
          const updatedCall = payload.new as CallLogPayload;
          console.log('[useCallLogsRealtime] Call updated:', {
            id: updatedCall.id,
            status: updatedCall.status,
          });

          // Invalidate queries when call is marked as viewed
          if (updatedCall.client_id) {
            queryClient.invalidateQueries({ 
              queryKey: ['client-unread-by-messenger', updatedCall.client_id] 
            });
            queryClient.invalidateQueries({ 
              queryKey: ['unviewed-missed-calls', updatedCall.client_id] 
            });
            queryClient.invalidateQueries({ 
              queryKey: ['call-logs', updatedCall.client_id] 
            });
          }
        }
      )
      .subscribe((status) => {
        console.log(`[useCallLogsRealtime] Subscription status: ${status}`);
      });

    channelRef.current = channel;

    return () => {
      console.log(`[useCallLogsRealtime] Unsubscribing from ${channelName}`);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [clientId, queryClient]);
};

/**
 * Hook for listening to missed call events
 * Use this to show notifications or update UI immediately when a missed call arrives
 */
export const useMissedCallListener = (
  onMissedCall: (detail: { callId: string; clientId: string | null; phoneNumber: string }) => void
) => {
  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ callId: string; clientId: string | null; phoneNumber: string }>;
      onMissedCall(customEvent.detail);
    };

    window.addEventListener('missed-call-received', handler);
    return () => window.removeEventListener('missed-call-received', handler);
  }, [onMissedCall]);
};
