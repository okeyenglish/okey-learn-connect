import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface GroupCoursePrice {
  id: string;
  course_name: string;
  duration_minutes: number;
  price_8_lessons: number;
  price_24_lessons: number;
  price_80_lessons: number;
  created_at?: string;
  updated_at?: string;
}

export function useGroupCoursePrices() {
  return useQuery({
    queryKey: ["group-course-prices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_course_prices")
        .select("*")
        .order("course_name");

      if (error) throw error;
      return data as GroupCoursePrice[];
    },
  });
}

export function useUpdateGroupCoursePrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prices: Partial<GroupCoursePrice>[]) => {
      const updates = prices.map((price) =>
        supabase
          .from("group_course_prices")
          .update({
            duration_minutes: price.duration_minutes,
            price_8_lessons: price.price_8_lessons,
            price_24_lessons: price.price_24_lessons,
            price_80_lessons: price.price_80_lessons,
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
      queryClient.invalidateQueries({ queryKey: ["group-course-prices"] });
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
