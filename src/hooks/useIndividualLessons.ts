import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface IndividualLesson {
  id: string;
  student_name: string;
  student_id?: string;
  branch: string;
  subject: string;
  level: string;
  category: 'preschool' | 'school' | 'adult' | 'all';
  lesson_type: string;
  status: 'reserve' | 'forming' | 'active' | 'suspended' | 'finished';
  duration?: number;
  academic_hours?: number;
  debt_hours?: number;
  teacher_name?: string;
  schedule_days?: string[];
  schedule_time?: string;
  lesson_location?: string;
  is_skype_only?: boolean;
  period_start?: string;
  period_end?: string;
  lesson_start_month?: string;
  lesson_end_month?: string;
  price_per_lesson?: number;
  audit_location?: string;
  description?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Новые поля
  break_minutes?: number;
  academic_hours_per_day?: number;
  responsible_manager?: string;
  payment_method?: 'per_lesson' | 'subscription' | 'prepaid';
  is_flexible_schedule?: boolean;
  requires_teacher?: boolean;
  teacher_rate?: number;
  color?: string;
  lesson_number?: string;
}

export interface IndividualLessonFilters {
  search?: string;
  branch?: string;
  subject?: string;
  level?: string;
  category?: string;
  teacher_name?: string;
  lesson_location?: string;
  is_skype_only?: boolean;
  has_debt?: boolean;
  period_start?: string;
  period_end?: string;
  schedule_days?: string[];
  time_start?: string;
  time_end?: string;
}

export const useIndividualLessons = (filters?: IndividualLessonFilters) => {
  const { data: lessons, isLoading, error } = useQuery({
    queryKey: ['individual-lessons', filters],
    queryFn: async () => {
      let query = supabase
        .from('individual_lessons')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.search) {
        query = query.or(`student_name.ilike.%${filters.search}%,teacher_name.ilike.%${filters.search}%`);
      }
      
      if (filters?.branch && filters.branch !== "all") {
        query = query.eq('branch', filters.branch);
      }
      
      if (filters?.subject && filters.subject !== "all") {
        query = query.eq('subject', filters.subject);
      }
      
      if (filters?.level && filters.level !== "all") {
        query = query.eq('level', filters.level);
      }
      
      if (filters?.category && filters.category !== "all") {
        query = query.eq('category', filters.category as any);
      }
      
      if (filters?.teacher_name) {
        query = query.ilike('teacher_name', `%${filters.teacher_name}%`);
      }
      
      if (filters?.lesson_location && filters.lesson_location !== "all") {
        query = query.eq('lesson_location', filters.lesson_location);
      }
      
      if (filters?.is_skype_only) {
        query = query.eq('is_skype_only', true);
      }
      
      if (filters?.has_debt) {
        query = query.gt('debt_hours', 0);
      }
      
      if (filters?.period_start) {
        query = query.gte('period_start', filters.period_start);
      }
      
      if (filters?.period_end) {
        query = query.lte('period_end', filters.period_end);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as IndividualLesson[];
    },
  });

  const createIndividualLesson = async (lessonData: Omit<IndividualLesson, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('individual_lessons')
      .insert([lessonData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  };

  return {
    lessons: lessons || [],
    isLoading,
    error,
    createIndividualLesson,
  };
};

export const useCreateIndividualLesson = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (lessonData: Omit<IndividualLesson, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('individual_lessons')
        .insert([lessonData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['individual-lessons'] });
    },
  });
};

export const useUpdateIndividualLesson = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<IndividualLesson> & { id: string }) => {
      const { data, error } = await supabase
        .from('individual_lessons')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Инвалидируем кэш индивидуальных уроков
      queryClient.invalidateQueries({ queryKey: ['individual-lessons'] });
      // Инвалидируем все кэши деталей студентов для обновления данных
      queryClient.invalidateQueries({ queryKey: ['student-details'] });
    },
  });
};

export const useDeleteIndividualLesson = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('individual_lessons')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['individual-lessons'] });
    },
  });
};

// Helper functions
export const formatScheduleForIndividual = (days?: string[], time?: string): string => {
  if (!days || !time) return 'Не указано';
  
  const dayMap: Record<string, string> = {
    'пн': 'Пн',
    'вт': 'Вт', 
    'ср': 'Ср',
    'чт': 'Чт',
    'пт': 'Пт',
    'сб': 'Сб',
    'вс': 'Вс'
  };
  
  const formattedDays = days.map(day => dayMap[day.toLowerCase()] || day).join('/');
  return `${formattedDays} ${time}`;
};

export const getLessonLocationLabel = (location?: string): string => {
  const labels = {
    'office': 'В офисе',
    'skype': 'По Skype',
    'home': 'На дому'
  };
  
  return labels[location as keyof typeof labels] || location || 'Не указано';
};