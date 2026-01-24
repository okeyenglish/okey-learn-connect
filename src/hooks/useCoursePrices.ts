import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/typedClient";
import { toast } from "@/hooks/use-toast";

export interface CoursePrice {
  id: string;
  course_name: string;
  price_per_40_min: number;
  price_per_academic_hour: number;
  created_at?: string;
  updated_at?: string;
}

export function useCoursePrices() {
  return useQuery({
    queryKey: ["course-prices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_prices")
        .select("*")
        .order("course_name");

      if (error) throw error;
      return data as CoursePrice[];
    },
  });
}

export function useUpdateCoursePrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prices: Partial<CoursePrice>[]) => {
      const updates = prices.map((price) =>
        supabase
          .from("course_prices")
          .update({
            price_per_40_min: price.price_per_40_min,
            price_per_academic_hour: price.price_per_academic_hour,
          })
          .eq("id", price.id)
      );

      const results = await Promise.all(updates);
      const errors = results.filter((r) => r.error);
      
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} prices`);
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-prices"] });
      toast({
        title: "Цены обновлены",
        description: "Изменения успешно сохранены",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка сохранения",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useAddCoursePrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (price: Omit<CoursePrice, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("course_prices")
        .insert(price)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-prices"] });
      toast({
        title: "Цена добавлена",
        description: "Новая цена успешно добавлена",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка добавления",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
