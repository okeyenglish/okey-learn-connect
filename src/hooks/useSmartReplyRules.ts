/**
 * CRUD hook for smart_reply_rules table (self-hosted Supabase).
 * Manages custom categories, triggers, and replies per organization.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface SmartReplyRule {
  id: string;
  organization_id: string;
  category: string;
  label: string;
  triggers: string[];
  replies: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type SmartReplyRuleInsert = Omit<SmartReplyRule, 'id' | 'created_at' | 'updated_at'>;
export type SmartReplyRuleUpdate = Partial<Omit<SmartReplyRule, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>;

const QUERY_KEY = 'smart-reply-rules';

export function useSmartReplyRules() {
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading, error } = useQuery({
    queryKey: [QUERY_KEY, organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('smart_reply_rules')
        .select('*')
        .eq('organization_id', organizationId)
        .order('sort_order', { ascending: true });
      if (error) {
        console.warn('smart_reply_rules fetch failed:', error.message);
        return [];
      }
      return (data || []) as SmartReplyRule[];
    },
    enabled: !!organizationId,
    staleTime: 60_000,
  });

  const createRule = useMutation({
    mutationFn: async (rule: Omit<SmartReplyRuleInsert, 'organization_id'>) => {
      if (!organizationId) throw new Error('No organization');
      const { data, error } = await supabase
        .from('smart_reply_rules')
        .insert({ ...rule, organization_id: organizationId })
        .select()
        .single();
      if (error) throw error;
      return data as SmartReplyRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
      toast.success('Категория создана');
    },
    onError: (err: Error) => {
      toast.error('Ошибка создания: ' + err.message);
    },
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, ...updates }: SmartReplyRuleUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('smart_reply_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as SmartReplyRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
      toast.success('Категория обновлена');
    },
    onError: (err: Error) => {
      toast.error('Ошибка обновления: ' + err.message);
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('smart_reply_rules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
      toast.success('Категория удалена');
    },
    onError: (err: Error) => {
      toast.error('Ошибка удаления: ' + err.message);
    },
  });

  return {
    rules,
    isLoading,
    error,
    createRule,
    updateRule,
    deleteRule,
    organizationId,
  };
}
