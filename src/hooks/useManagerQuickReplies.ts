import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useAuth } from './useAuth';

export interface QuickReply {
  id: string;
  text: string;
  category: string;
  is_approved: boolean;
  usage_count: number;
  created_by: string | null;
  created_at: string;
}

type QuickReplyCategory = 'activity_warning' | 'tab_feedback';

/**
 * Fetch approved quick replies for a category
 */
export function useQuickReplies(category: QuickReplyCategory) {
  return useQuery({
    queryKey: ['quick-replies', category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manager_quick_replies')
        .select('*')
        .eq('category', category)
        .eq('is_approved', true)
        .order('usage_count', { ascending: false });

      if (error) {
        console.warn('[useQuickReplies] Error fetching replies:', error);
        // Return default replies if table doesn't exist
        return getDefaultReplies(category);
      }

      return (data || []) as QuickReply[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Track usage of a quick reply
 */
export function useTrackQuickReplyUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (replyId: string) => {
      const { error } = await supabase.rpc('increment_quick_reply_usage', { reply_id: replyId });
      if (error) {
        // Try direct update if RPC doesn't exist
        await supabase
          .from('manager_quick_replies')
          .update({ usage_count: supabase.rpc('increment', { x: 1 }) as unknown as number })
          .eq('id', replyId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-replies'] });
    },
  });
}

/**
 * Submit a new custom reply suggestion
 */
export function useSubmitQuickReplySuggestion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ text, category }: { text: string; category: QuickReplyCategory }) => {
      const { data, error } = await supabase
        .from('manager_quick_replies')
        .insert({
          text,
          category,
          is_approved: false,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) {
        console.error('[useSubmitQuickReplySuggestion] Error:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-replies'] });
    },
  });
}

/**
 * Default replies if database table doesn't exist
 */
function getDefaultReplies(category: QuickReplyCategory): QuickReply[] {
  const now = new Date().toISOString();
  
  if (category === 'activity_warning') {
    return [
      { id: '1', text: 'Хорошо, исправлюсь', category, is_approved: true, usage_count: 0, created_by: null, created_at: now },
      { id: '2', text: 'У меня была консультация', category, is_approved: true, usage_count: 0, created_by: null, created_at: now },
      { id: '3', text: 'Работал с документами', category, is_approved: true, usage_count: 0, created_by: null, created_at: now },
      { id: '4', text: 'Был на звонке', category, is_approved: true, usage_count: 0, created_by: null, created_at: now },
    ];
  }
  
  if (category === 'tab_feedback') {
    return [
      { id: '5', text: 'Всё хорошо, работаю!', category, is_approved: true, usage_count: 0, created_by: null, created_at: now },
      { id: '6', text: 'Был на перерыве', category, is_approved: true, usage_count: 0, created_by: null, created_at: now },
      { id: '7', text: 'Работал в другой системе', category, is_approved: true, usage_count: 0, created_by: null, created_at: now },
    ];
  }
  
  return [];
}
