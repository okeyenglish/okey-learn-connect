import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string | null;
  subscription_type: 'per_lesson' | 'monthly' | 'weekly';
  lessons_count?: number | null;
  duration_days?: number | null;
  price: number;
  price_per_lesson?: number | null;
  is_active?: boolean | null;
  freeze_days_allowed?: number | null;
  branch?: string | null;
  subject?: string | null;
  age_category?: 'preschool' | 'school' | 'adult' | 'all' | null;
  auto_renewal?: boolean | null;
  makeup_lessons_count?: number | null;
  max_level?: string | null;
  min_level?: string | null;
  sort_order?: number | null;
  created_at: string;
  updated_at: string;
}

export const useSubscriptionPlans = () => {
  return useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SubscriptionPlan[];
    },
  });
};

export const useCreateSubscriptionPlan = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (planData: Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .insert(planData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success('Тарифный план создан');
    },
    onError: (error) => {
      console.error('Error creating subscription plan:', error);
      toast.error('Ошибка при создании тарифного плана');
    },
  });
};

export const useUpdateSubscriptionPlan = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SubscriptionPlan> & { id: string }) => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success('Тарифный план обновлен');
    },
    onError: (error) => {
      console.error('Error updating subscription plan:', error);
      toast.error('Ошибка при обновлении тарифного плана');
    },
  });
};

export const useDeleteSubscriptionPlan = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success('Тарифный план удален');
    },
    onError: (error) => {
      console.error('Error deleting subscription plan:', error);
      toast.error('Ошибка при удалении тарифного плана');
    },
  });
};