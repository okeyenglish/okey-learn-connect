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

/** DB row shape with joined student */
interface SubscriptionRow {
  id: string;
  student_id: string;
  name: string;
  status: string;
  subscription_type: string;
  total_lessons: number | null;
  remaining_lessons: number | null;
  total_price: number;
  price_per_lesson: number | null;
  start_date: string;
  valid_until: string | null;
  freeze_enabled: boolean | null;
  branch: string;
  subject: string;
  level: string | null;
  created_at: string;
  updated_at: string;
  student?: {
    id: string;
    name: string;
    phone: string | null;
  } | null;
}

type SubscriptionInsert = Omit<Subscription, 'id' | 'created_at' | 'updated_at' | 'student'>;

export const useSubscriptions = () => {
  return useQuery({
    queryKey: ['subscriptions'],
    queryFn: async (): Promise<Subscription[]> => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          student:students(id, name, phone)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = (data || []) as unknown as SubscriptionRow[];
      return rows.map((row) => ({
        ...row,
        status: row.status as Subscription['status'],
        subscription_type: row.subscription_type as Subscription['subscription_type'],
        student: row.student ?? undefined,
      }));
    },
  });
};

export const useCreateSubscription = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (subscriptionData: SubscriptionInsert) => {
      const { data, error } = await supabase
        .from('subscriptions')
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
      const { data, error } = await supabase
        .from('subscriptions')
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
      console.log('Freeze params:', { startDate, endDate, reason });
      const { data, error } = await supabase
        .from('subscriptions')
        .update({ status: 'paused' })
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
      const { data, error } = await supabase
        .from('subscriptions')
        .update({ status: 'active' })
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
