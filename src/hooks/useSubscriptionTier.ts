import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SubscriptionTier = 'free' | 'paid';

export interface OrganizationAISettings {
  organization_id: string;
  organization_name: string;
  subscription_tier: SubscriptionTier;
  ai_limit: number;
  key_type: 'free' | 'byok' | null;
  limit_remaining: number | null;
  limit_monthly: number | null;
  key_status: string | null;
}

export const useOrganizationAISettings = (organizationId?: string) => {
  return useQuery({
    queryKey: ['organization_ai_settings', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_organization_ai_settings')
        .select('*')
        .eq('organization_id', organizationId!)
        .single();

      if (error) throw error;
      return data as OrganizationAISettings;
    },
    enabled: !!organizationId,
  });
};

export const useUpdateSubscriptionTier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      tier,
    }: {
      organizationId: string;
      tier: SubscriptionTier;
    }) => {
      const { error } = await supabase
        .from('organizations')
        .update({ subscription_tier: tier })
        .eq('id', organizationId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['organization_ai_settings', variables.organizationId],
      });
      toast.success('Тариф успешно обновлен');
    },
    onError: (error) => {
      toast.error('Не удалось обновить тариф: ' + error.message);
    },
  });
};

export const useAIModelMappings = () => {
  return useQuery({
    queryKey: ['ai_model_mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_model_mappings')
        .select('*')
        .eq('is_active', true)
        .order('use_case', { ascending: true })
        .order('tier', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
};
