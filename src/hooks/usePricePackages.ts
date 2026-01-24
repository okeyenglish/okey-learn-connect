import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useToast } from '@/hooks/use-toast';

export interface PricePackage {
  id: string;
  name: string;
  description?: string;
  hours_count: number;
  price: number;
  currency: string;
  branch?: string;
  subject?: string;
  learning_type?: string;
  age_category_id?: string;
  validity_days?: number;
  can_freeze: boolean;
  max_freeze_days: number;
  can_pay_partially: boolean;
  min_payment_percent: number;
  is_active: boolean;
  sort_order: number;
  external_id?: string;
  holihope_metadata?: any;
  organization_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentFreeze {
  id: string;
  payment_id: string;
  freeze_start: string;
  freeze_end?: string;
  days_count?: number;
  reason?: string;
  created_by?: string;
  created_at: string;
}

// Получить все пакеты цен
export const usePricePackages = (filters?: {
  branch?: string;
  subject?: string;
  learningType?: string;
  isActive?: boolean;
}) => {
  return useQuery({
    queryKey: ['price-packages', filters],
    queryFn: async () => {
      let query = (supabase
        .from('price_packages' as any) as any)
        .select('*')
        .order('sort_order', { ascending: true });

      if (filters?.branch) {
        query = query.or(`branch.eq.${filters.branch},branch.is.null`);
      }
      if (filters?.subject) {
        query = query.or(`subject.eq.${filters.subject},subject.is.null`);
      }
      if (filters?.learningType) {
        query = query.or(`learning_type.eq.${filters.learningType},learning_type.eq.both,learning_type.is.null`);
      }
      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as PricePackage[];
    },
  });
};

// Получить один пакет
export const usePricePackage = (id?: string) => {
  return useQuery({
    queryKey: ['price-package', id],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('price_packages' as any) as any)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as PricePackage;
    },
    enabled: !!id,
  });
};

// Создать/обновить пакет
export const useUpsertPricePackage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (pkg: Partial<PricePackage> & { name: string; hours_count: number; price: number }) => {
      if (pkg.id) {
        const { data, error } = await (supabase
          .from('price_packages' as any) as any)
          .update({
            name: pkg.name,
            description: pkg.description,
            hours_count: pkg.hours_count,
            price: pkg.price,
            currency: pkg.currency || 'RUB',
            branch: pkg.branch,
            subject: pkg.subject,
            learning_type: pkg.learning_type,
            age_category_id: pkg.age_category_id,
            validity_days: pkg.validity_days,
            can_freeze: pkg.can_freeze ?? false,
            max_freeze_days: pkg.max_freeze_days ?? 0,
            can_pay_partially: pkg.can_pay_partially ?? true,
            min_payment_percent: pkg.min_payment_percent ?? 100,
            is_active: pkg.is_active ?? true,
            sort_order: pkg.sort_order ?? 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', pkg.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await (supabase
          .from('price_packages' as any) as any)
          .insert({
            name: pkg.name,
            description: pkg.description,
            hours_count: pkg.hours_count,
            price: pkg.price,
            currency: pkg.currency || 'RUB',
            branch: pkg.branch,
            subject: pkg.subject,
            learning_type: pkg.learning_type,
            age_category_id: pkg.age_category_id,
            validity_days: pkg.validity_days,
            can_freeze: pkg.can_freeze ?? false,
            max_freeze_days: pkg.max_freeze_days ?? 0,
            can_pay_partially: pkg.can_pay_partially ?? true,
            min_payment_percent: pkg.min_payment_percent ?? 100,
            is_active: pkg.is_active ?? true,
            sort_order: pkg.sort_order ?? 0,
            organization_id: pkg.organization_id,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-packages'] });
      toast({
        title: 'Успешно',
        description: 'Пакет цен сохранён',
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

// Удалить пакет
export const useDeletePricePackage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('price_packages' as any) as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-packages'] });
      toast({
        title: 'Успешно',
        description: 'Пакет удалён',
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

// Заморозить оплату
export const useFreezePayment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ paymentId, reason }: { paymentId: string; reason?: string }) => {
      const today = new Date().toISOString().split('T')[0];

      // Создаём запись о заморозке
      const { error: freezeError } = await (supabase
        .from('payment_freezes' as any) as any)
        .insert({
          payment_id: paymentId,
          freeze_start: today,
          reason,
        });

      if (freezeError) throw freezeError;

      // Обновляем оплату
      const { error: paymentError } = await (supabase
        .from('payments' as any) as any)
        .update({
          is_frozen: true,
          frozen_at: today,
        })
        .eq('id', paymentId);

      if (paymentError) throw paymentError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['student-group-payment-stats'] });
      toast({
        title: 'Успешно',
        description: 'Оплата заморожена',
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

// Разморозить оплату
export const useUnfreezePayment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (paymentId: string) => {
      const today = new Date().toISOString().split('T')[0];

      // Получаем текущую заморозку
      const { data: payment } = await (supabase
        .from('payments' as any) as any)
        .select('frozen_at, freeze_days_used')
        .eq('id', paymentId)
        .single();

      if (!payment) throw new Error('Оплата не найдена');

      // Вычисляем дни заморозки
      const frozenAt = (payment as any).frozen_at;
      const freezeDaysUsed = (payment as any).freeze_days_used || 0;
      let additionalDays = 0;

      if (frozenAt) {
        const startDate = new Date(frozenAt);
        const endDate = new Date(today);
        additionalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Обновляем последнюю запись заморозки
      const { data: freezes } = await (supabase
        .from('payment_freezes' as any) as any)
        .select('id')
        .eq('payment_id', paymentId)
        .is('freeze_end', null)
        .limit(1);

      if (freezes && freezes.length > 0) {
        await (supabase
          .from('payment_freezes' as any) as any)
          .update({
            freeze_end: today,
            days_count: additionalDays,
          })
          .eq('id', (freezes[0] as any).id);
      }

      // Обновляем оплату и продлеваем срок действия
      const { data: fullPayment } = await (supabase
        .from('payments' as any) as any)
        .select('expires_at')
        .eq('id', paymentId)
        .single();

      let newExpiresAt = null;
      if ((fullPayment as any)?.expires_at && additionalDays > 0) {
        const expiresDate = new Date((fullPayment as any).expires_at);
        expiresDate.setDate(expiresDate.getDate() + additionalDays);
        newExpiresAt = expiresDate.toISOString().split('T')[0];
      }

      const updateData: any = {
        is_frozen: false,
        frozen_at: null,
        freeze_days_used: freezeDaysUsed + additionalDays,
      };

      if (newExpiresAt) {
        updateData.expires_at = newExpiresAt;
      }

      const { error } = await (supabase
        .from('payments' as any) as any)
        .update(updateData)
        .eq('id', paymentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['student-group-payment-stats'] });
      toast({
        title: 'Успешно',
        description: 'Оплата разморожена, срок действия продлён',
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

// Получить историю заморозок
export const usePaymentFreezes = (paymentId?: string) => {
  return useQuery({
    queryKey: ['payment-freezes', paymentId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('payment_freezes' as any) as any)
        .select('*')
        .eq('payment_id', paymentId)
        .order('freeze_start', { ascending: false });

      if (error) throw error;
      return (data || []) as PaymentFreeze[];
    },
    enabled: !!paymentId,
  });
};

// Вычислить цену за академический час из пакета
export const getPricePerHour = (pkg: PricePackage): number => {
  return pkg.hours_count > 0 ? pkg.price / pkg.hours_count : 0;
};
