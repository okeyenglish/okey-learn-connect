import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { RealtimeChannel } from '@supabase/supabase-js';
import { updateAvatarCache } from '@/lib/avatarCache';

interface ClientAvatarPayload {
  id: string;
  whatsapp_avatar_url?: string | null;
  telegram_avatar_url?: string | null;
  max_avatar_url?: string | null;
}

/**
 * Global provider that initializes realtime subscription for avatar updates.
 * This ensures avatars sync across tabs even without an open chat.
 */
export const RealtimeAvatarsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Only subscribe when user is authenticated
    if (!user) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        console.log('[AvatarRealtime] Channel removed (user logged out)');
      }
      return;
    }

    // Already subscribed
    if (channelRef.current) return;

    channelRef.current = supabase
      .channel('global-clients-avatar-changes')
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

            // Update shared in-memory cache
            updateAvatarCache(newData.id, {
              whatsapp: newData.whatsapp_avatar_url,
              telegram: newData.telegram_avatar_url,
              max: newData.max_avatar_url,
            });

            // Invalidate React Query cache for immediate UI refresh
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['client', newData.id] });
            queryClient.invalidateQueries({ queryKey: ['chat-threads-infinite'] });
            queryClient.invalidateQueries({ queryKey: ['chat-threads-unread-priority'] });
            queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
          }
        }
      )
      .subscribe((status) => {
        console.log('[AvatarRealtime] Global channel status:', status);
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        console.log('[AvatarRealtime] Global channel removed');
      }
    };
  }, [user, queryClient]);

  return <>{children}</>;
};
