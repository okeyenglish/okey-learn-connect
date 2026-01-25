import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { toast } from 'sonner';

export interface OrganizationBalance {
  id: string;
  organization_id: string;
  balance: number;
  currency_id: string;
  total_topped_up: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface BalanceTransaction {
  id: string;
  organization_id: string;
  amount: number;
  transaction_type: 'topup' | 'ai_usage' | 'refund' | 'adjustment';
  currency_id: string;
  description: string;
  ai_requests_count: number | null;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
}

export const useOrganizationBalance = (organizationId?: string) => {
  return useQuery({
    queryKey: ['organization_balance', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      const { data, error } = await supabase
        .from('organization_balances')
        .select('*')
        .eq('organization_id', organizationId)
        .single();

      if (error) throw error;
      return data as OrganizationBalance;
    },
    enabled: !!organizationId,
  });
};

export const useBalanceTransactions = (organizationId?: string) => {
  return useQuery({
    queryKey: ['balance_transactions', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      const { data, error } = await supabase
        .from('organization_balance_transactions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as BalanceTransaction[];
    },
    enabled: !!organizationId,
  });
};

export const useTopUpBalance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      amount,
      description,
    }: {
      organizationId: string;
      amount: number;
      description?: string;
    }) => {
      const { data, error } = await supabase.rpc('topup_organization_balance', {
        p_organization_id: organizationId,
        p_amount: amount,
        p_description: description,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['organization_balance', variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['balance_transactions', variables.organizationId],
      });
      toast.success('Баланс успешно пополнен');
    },
    onError: (error) => {
      toast.error('Ошибка при пополнении баланса: ' + error.message);
    },
  });
};
