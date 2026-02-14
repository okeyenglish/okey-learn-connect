/**
 * Smart Reply popularity tracking — combined personal + org-wide ranking.
 * Uses self-hosted Supabase table `smart_reply_stats`.
 */
import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getSmartReplies, detectCategory } from '@/hooks/useSmartReplies';

interface SmartReplyStatRow {
  user_id: string;
  reply_text: string;
  use_count: number;
}

/**
 * Fetch all org stats, sort replies by combined personal + org popularity.
 */
export function useSmartRepliesWithStats(lastIncomingMessage: string | null) {
  const { user, profile } = useAuth();
  const organizationId = profile?.organization_id;
  const userId = user?.id;

  // Fetch org-wide stats
  const { data: stats } = useQuery({
    queryKey: ['smart-reply-stats', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('smart_reply_stats')
        .select('user_id, reply_text, use_count')
        .eq('organization_id', organizationId);
      if (error) {
        console.warn('Smart reply stats fetch failed (table may not exist):', error.message);
        return [];
      }
      return (data || []) as SmartReplyStatRow[];
    },
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 min cache
  });

  // Sort replies by combined score
  const sortedReplies = useMemo(() => {
    const rawReplies = lastIncomingMessage ? getSmartReplies(lastIncomingMessage) : [];
    if (rawReplies.length === 0 || !stats || stats.length === 0) return rawReplies;

    // Build score map: personal weight = 3x, org weight = 1x
    const scoreMap = new Map<string, number>();
    for (const reply of rawReplies) {
      scoreMap.set(reply, 0);
    }

    for (const row of stats) {
      if (!scoreMap.has(row.reply_text)) continue;
      const current = scoreMap.get(row.reply_text) || 0;
      const weight = row.user_id === userId ? 3 : 1;
      scoreMap.set(row.reply_text, current + row.use_count * weight);
    }

    return [...rawReplies].sort((a, b) => (scoreMap.get(b) || 0) - (scoreMap.get(a) || 0));
  }, [lastIncomingMessage, stats, userId]);

  return sortedReplies;
}

/**
 * Mutation to track a smart reply usage.
 */
export function useTrackSmartReply() {
  const { user, profile } = useAuth();
  const organizationId = profile?.organization_id;
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ replyText, incomingMessage }: { replyText: string; incomingMessage: string }) => {
      if (!user?.id || !organizationId) return;
      const category = detectCategory(incomingMessage) || 'unknown';

      const { error } = await supabase.rpc('increment_smart_reply_stat', {
        p_organization_id: organizationId,
        p_user_id: user.id,
        p_reply_text: replyText,
        p_category: category,
      });

      if (error) {
        console.warn('Smart reply stat tracking failed (RPC may not exist):', error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-reply-stats', organizationId] });
    },
  });

  const trackReply = useCallback(
    (replyText: string, incomingMessage: string) => {
      mutation.mutate({ replyText, incomingMessage });
    },
    [mutation],
  );

  return trackReply;
}
