import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/typedClient";
import { useToast } from "@/hooks/use-toast";
import type { DiscountSurcharge, StudentDiscountSurcharge } from "@/integrations/supabase/database.types";

export type { DiscountSurcharge };

export interface StudentDiscount extends StudentDiscountSurcharge {
  discount?: DiscountSurcharge;
}

export interface PriceCalculation {
  final_price: number;
  total_discount: number;
  total_surcharge: number;
  calculations: Array<{
    type: 'discount' | 'surcharge';
    name: string;
    value_type: 'fixed' | 'percent';
    value: number;
    applied: number;
    price_after: number;
  }>;
}

// Получить все скидки/доплаты
export const useDiscountsSurcharges = (type?: 'discount' | 'surcharge') => {
  return useQuery({
    queryKey: ['discounts-surcharges', type],
    queryFn: async () => {
      let query = supabase
        .from('discounts_surcharges')
        .select('*')
        .eq('is_active', true);

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query.order('apply_priority', { ascending: true });

      if (error) throw error;
      return (data || []) as DiscountSurcharge[];
    },
  });
};

// Получить скидки/доплаты студента
export const useStudentDiscounts = (studentId?: string) => {
  return useQuery({
    queryKey: ['student-discounts', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      
      const { data, error } = await supabase
        .from('student_discounts_surcharges')
        .select(`
          *,
          discount:discounts_surcharges(*)
        `)
        .eq('student_id', studentId);

      if (error) throw error;
      return (data || []) as StudentDiscount[];
    },
    enabled: !!studentId,
  });
};

// Создать скидку/доплату
export const useCreateDiscount = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (discount: Partial<DiscountSurcharge>) => {
      const { data, error } = await supabase
        .from('discounts_surcharges')
        .insert(discount)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts-surcharges'] });
      toast({
        title: "Успешно",
        description: "Скидка/доплата создана",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать скидку/доплату",
        variant: "destructive",
      });
    },
  });
};

// Обновить скидку/доплату
export const useUpdateDiscount = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DiscountSurcharge> }) => {
      const { data, error } = await supabase
        .from('discounts_surcharges')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts-surcharges'] });
      toast({
        title: "Успешно",
        description: "Скидка/доплата обновлена",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить скидку/доплату",
        variant: "destructive",
      });
    },
  });
};

// Применить скидку к студенту
export const useApplyDiscountToStudent = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      studentId,
      discountId,
      isPermanent = false,
      maxUses,
      validFrom,
      validUntil,
      notes,
    }: {
      studentId: string;
      discountId: string;
      isPermanent?: boolean;
      maxUses?: number;
      validFrom?: string;
      validUntil?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc('apply_discount_to_student' as any, {
        _student_id: studentId,
        _discount_id: discountId,
        _is_permanent: isPermanent,
        _max_uses: maxUses || null,
        _valid_from: validFrom || null,
        _valid_until: validUntil || null,
        _notes: notes || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-discounts', variables.studentId] });
      toast({
        title: "Успешно",
        description: "Скидка применена к студенту",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось применить скидку",
        variant: "destructive",
      });
    },
  });
};

// Удалить скидку у студента
export const useRemoveStudentDiscount = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, studentId }: { id: string; studentId: string }) => {
      const { error } = await supabase
        .from('student_discounts_surcharges')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { studentId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['student-discounts', data.studentId] });
      toast({
        title: "Успешно",
        description: "Скидка удалена",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить скидку",
        variant: "destructive",
      });
    },
  });
};

// Рассчитать цену с учётом скидок
export const useCalculatePriceWithDiscounts = () => {
  return useMutation({
    mutationFn: async ({
      basePrice,
      studentId,
      discountIds,
    }: {
      basePrice: number;
      studentId: string;
      discountIds?: string[];
    }) => {
      const { data, error } = await supabase.rpc('calculate_price_with_discounts' as any, {
        _base_price: basePrice,
        _student_id: studentId,
        _discount_ids: discountIds || null,
      });

      if (error) throw error;
      return (data && data.length > 0 ? data[0] : null) as PriceCalculation | null;
    },
  });
};
