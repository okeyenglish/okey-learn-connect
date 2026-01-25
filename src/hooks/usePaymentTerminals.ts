import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useToast } from '@/hooks/use-toast';

export interface PaymentTerminal {
  id: string;
  organization_id: string;
  branch_id: string | null;
  provider: string;
  terminal_key: string;
  terminal_password: string;
  is_test_mode: boolean;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  branch?: {
    id: string;
    name: string;
  };
}

/** DB row for payment terminal with branch join */
interface PaymentTerminalRow {
  id: string;
  organization_id: string;
  branch_id: string | null;
  provider: string;
  terminal_key: string;
  terminal_password: string;
  is_test_mode: boolean;
  is_active: boolean;
  settings: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  branch?: { id: string; name: string } | null;
}

export const usePaymentTerminals = (organizationId?: string) => {
  return useQuery({
    queryKey: ['payment-terminals', organizationId],
    queryFn: async (): Promise<PaymentTerminal[]> => {
      if (!organizationId) throw new Error('Organization ID required');

      const { data, error } = await supabase
        .from('payment_terminals')
        .select(`
          *,
          branch:organization_branches(id, name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = (data || []) as unknown as PaymentTerminalRow[];
      return rows.map((row) => ({
        id: row.id,
        organization_id: row.organization_id,
        branch_id: row.branch_id,
        provider: row.provider,
        terminal_key: row.terminal_key,
        terminal_password: row.terminal_password,
        is_test_mode: row.is_test_mode,
        is_active: row.is_active,
        settings: row.settings || {},
        created_at: row.created_at,
        updated_at: row.updated_at,
        branch: row.branch ?? undefined,
      }));
    },
    enabled: !!organizationId,
  });
};

export const useCreatePaymentTerminal = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (terminal: {
      organization_id: string;
      branch_id?: string | null;
      terminal_key: string;
      terminal_password: string;
      is_test_mode?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('payment_terminals')
        .insert({
          organization_id: terminal.organization_id,
          branch_id: terminal.branch_id || null,
          terminal_key: terminal.terminal_key,
          terminal_password: terminal.terminal_password,
          is_test_mode: terminal.is_test_mode ?? false,
          provider: 'tbank',
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as PaymentTerminalRow;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payment-terminals', variables.organization_id] });
      toast({
        title: 'Терминал добавлен',
        description: 'Платежный терминал успешно настроен',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdatePaymentTerminal = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PaymentTerminal> & { id: string }) => {
      const { data, error } = await supabase
        .from('payment_terminals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as PaymentTerminalRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payment-terminals', data?.organization_id] });
      toast({
        title: 'Терминал обновлен',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeletePaymentTerminal = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, organizationId }: { id: string; organizationId: string }) => {
      const { error } = await supabase
        .from('payment_terminals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { organizationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payment-terminals', data.organizationId] });
      toast({
        title: 'Терминал удален',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useInitOnlinePayment = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      student_id: string;
      amount: number;
      description?: string;
      branch_id?: string;
      success_url?: string;
      fail_url?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('tbank-init', {
        body: params,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка создания платежа',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
