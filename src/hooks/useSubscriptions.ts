import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { toast } from 'sonner';

export interface Subscription {
  id: string;
  student_id: string;
  name: string;
  status: 'active' | 'paused' | 'expired' | 'cancelled';
  subscription_type: 'per_lesson' | 'monthly' | 'weekly';
  total_lessons?: number;
  remaining_lessons?: number;
  total_price: number;
  price_per_lesson?: number;
  start_date: string;
  valid_until?: string;
  freeze_enabled?: boolean;
  branch: string;
  subject: string;
  level?: string;
  created_at: string;
  updated_at: string;
  student?: {
    id: string;
    name: string;
    phone?: string;
  };
}

export const useSubscriptions = () => {
  return useQuery({
    queryKey: ['subscriptions'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('subscriptions' as any) as any)
        .select(`
          *,
          student:students(id, name, phone)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Subscription[];
    },
  });
};

export const useCreateSubscription = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (subscriptionData: Omit<Subscription, 'id' | 'created_at' | 'updated_at' | 'student'>) => {
      const { data, error } = await (supabase
        .from('subscriptions' as any) as any)
        .insert(subscriptionData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('Абонемент создан');
    },
    onError: (error) => {
      console.error('Error creating subscription:', error);
      toast.error('Ошибка при создании абонемента');
    },
  });
};

export const useUpdateSubscription = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Subscription> & { id: string }) => {
      const { data, error } = await (supabase
        .from('subscriptions' as any) as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('Абонемент обновлен');
    },
    onError: (error) => {
      console.error('Error updating subscription:', error);
      toast.error('Ошибка при обновлении абонемента');
    },
  });
};

export const useFreezeSubscription = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      subscriptionId, 
      startDate, 
      endDate, 
      reason 
    }: {
      subscriptionId: string;
      startDate: string;
      endDate: string;
      reason: string;
    }) => {
      // Temporary implementation - would use RPC function when it exists
      const { data, error } = await (supabase
        .from('subscriptions' as any) as any)
        .update({ status: 'paused' as const })
        .eq('id', subscriptionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('Абонемент заморожен');
    },
    onError: (error) => {
      console.error('Error freezing subscription:', error);
      toast.error('Ошибка при заморозке абонемента');
    },
  });
};

export const useUnfreezeSubscription = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      // Temporary implementation - would use RPC function when it exists
      const { data, error } = await (supabase
        .from('subscriptions' as any) as any)
        .update({ status: 'active' as const })
        .eq('id', subscriptionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('Абонемент разморожен');
    },
    onError: (error) => {
      console.error('Error unfreezing subscription:', error);
      toast.error('Ошибка при разморозке абонемента');
    },
  });
};
