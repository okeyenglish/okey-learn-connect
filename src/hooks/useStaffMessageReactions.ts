import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SELF_HOSTED_URL, SELF_HOSTED_ANON_KEY, getAuthToken } from '@/lib/selfHostedApi';
import { supabase } from '@/integrations/supabase/client';

export interface StaffReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface GroupedStaffReaction {
  emoji: string;
  count: number;
  userIds: string[];
  isOwn: boolean;
}

const REST_URL = `${SELF_HOSTED_URL}/rest/v1`;

async function getHeaders() {
  const token = await getAuthToken();
  return {
    'Content-Type': 'application/json',
    'apikey': SELF_HOSTED_ANON_KEY,
    'Authorization': `Bearer ${token || SELF_HOSTED_ANON_KEY}`,
  };
}

/**
 * Broadcast a reaction change so other clients refresh instantly
 */
function broadcastReactionChange(messageId: string) {
  supabase.channel('staff-reactions-sync').send({
    type: 'broadcast',
    event: 'reaction_changed',
    payload: { message_id: messageId },
  });
}

/**
 * Subscribe to reaction broadcast events and invalidate cache
 */
export const useStaffReactionsBroadcast = () => {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (channelRef.current) return;

    channelRef.current = supabase
      .channel('staff-reactions-sync')
      .on('broadcast', { event: 'reaction_changed' }, () => {
        queryClient.invalidateQueries({ queryKey: ['staff-message-reactions'] });
      })
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [queryClient]);
};

/**
 * Fetch reactions for multiple message IDs (batch)
 */
export const useStaffReactionsBatch = (messageIds: string[]) => {
  return useQuery({
    queryKey: ['staff-message-reactions', messageIds.sort().join(',')],
    queryFn: async () => {
      if (!messageIds.length) return {};
      
      const headers = await getHeaders();
      const idsParam = `(${messageIds.join(',')})`;
      const res = await fetch(
        `${REST_URL}/staff_message_reactions?message_id=in.${idsParam}&select=id,message_id,user_id,emoji,created_at`,
        { headers }
      );
      
      if (!res.ok) return {};
      
      const data: StaffReaction[] = await res.json();
      
      // Group by message_id
      const byMessage: Record<string, StaffReaction[]> = {};
      for (const r of data) {
        if (!byMessage[r.message_id]) byMessage[r.message_id] = [];
        byMessage[r.message_id].push(r);
      }
      return byMessage;
    },
    enabled: messageIds.length > 0,
    staleTime: 10_000,
  });
};

/**
 * Get grouped reactions for a single message from batch data
 */
export function groupReactions(reactions: StaffReaction[], currentUserId?: string): GroupedStaffReaction[] {
  const map: Record<string, GroupedStaffReaction> = {};
  for (const r of reactions) {
    if (!map[r.emoji]) {
      map[r.emoji] = { emoji: r.emoji, count: 0, userIds: [], isOwn: false };
    }
    map[r.emoji].count++;
    map[r.emoji].userIds.push(r.user_id);
    if (r.user_id === currentUserId) map[r.emoji].isOwn = true;
  }
  return Object.values(map);
}

export const useAddStaffReaction = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!user) throw new Error('Not authenticated');
      const headers = await getHeaders();
      
      // Upsert: update emoji if reaction exists, insert if not
      const res = await fetch(
        `${REST_URL}/staff_message_reactions?on_conflict=message_id,user_id`,
        {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify({
            message_id: messageId,
            user_id: user.id,
            emoji,
          }),
        }
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to add reaction: ${text}`);
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff-message-reactions'] });
      broadcastReactionChange(variables.messageId);
    },
  });
};

export const useRemoveStaffReaction = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (messageId: string) => {
      if (!user) throw new Error('Not authenticated');
      const headers = await getHeaders();
      
      const res = await fetch(
        `${REST_URL}/staff_message_reactions?message_id=eq.${messageId}&user_id=eq.${user.id}`,
        {
          method: 'DELETE',
          headers: { ...headers, 'Prefer': 'return=minimal' },
        }
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to remove reaction: ${text}`);
      }
    },
    onSuccess: (_, messageId) => {
      queryClient.invalidateQueries({ queryKey: ['staff-message-reactions'] });
      broadcastReactionChange(messageId);
    },
  });
};
