import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';

export interface LearningGroup {
  id: string;
  name: string;
  custom_name?: string;
  branch: string;
  subject: string;
  level: string;
  category: 'preschool' | 'school' | 'adult' | 'all';
  group_type: 'general' | 'mini';
  status: 'reserve' | 'forming' | 'active' | 'suspended' | 'finished';
  capacity: number;
  current_students: number;
  academic_hours?: number;
  schedule_days?: string[];
  schedule_time?: string;
  schedule_room?: string;
  period_start?: string;
  period_end?: string;
  lesson_start_time?: string;
  lesson_end_time?: string;
  lesson_start_month?: string;
  lesson_end_month?: string;
  debt_count?: number;
  zoom_link?: string;
  description?: string;
  responsible_teacher?: string;
  course_id?: string;
  course_name?: string;
  total_lessons?: number;
  course_start_date?: string;
  lessons_generated?: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Новые поля из Этапа 1
  is_auto_group?: boolean;
  auto_filter_conditions?: Record<string, any>;
  responsible_manager_id?: string;
  custom_name_locked?: boolean;
  enrollment_url?: string;
  color_code?: string;
}

export interface GroupFilters {
  search?: string;
  branch?: string;
  subject?: string;
  level?: string;
  category?: string;
  group_type?: string;
  status?: string[];
  responsible_teacher?: string;
  only_with_debt?: boolean;
}

export const useLearningGroups = (filters?: GroupFilters) => {
  const { data: groups, isLoading, error } = useQuery({
    queryKey: ['learning-groups', filters],
    queryFn: async () => {
      let query = supabase
        .from('learning_groups')
        .select(`
          *,
          courses:course_id (
            title
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,custom_name.ilike.%${filters.search}%`);
      }
      
      if (filters?.branch) {
        query = query.eq('branch', filters.branch);
      }
      
      if (filters?.subject) {
        query = query.eq('subject', filters.subject);
      }
      
      if (filters?.level) {
        query = query.eq('level', filters.level);
      }
      
      if (filters?.category) {
        query = query.eq('category', filters.category as any);
      }
      
      if (filters?.group_type) {
        query = query.eq('group_type', filters.group_type as any);
      }
      
      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status as any);
      }
      
      if (filters?.responsible_teacher) {
        query = query.eq('responsible_teacher', filters.responsible_teacher);
      }
      
      if (filters?.only_with_debt) {
        query = query.gt('debt_count', 0);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Преобразуем данные, добавляя course_name из связанной таблицы
      const groupsWithCourseNames = (data || []).map((group: any) => {
        const result: any = { ...group };
        
        // Добавляем course_name из вложенного объекта courses
        if (group.courses && typeof group.courses === 'object' && !Array.isArray(group.courses)) {
          result.course_name = group.courses.title || null;
        } else {
          result.course_name = null;
        }
        
        // Удаляем вложенный объект courses
        delete result.courses;
        
        return result;
      });
      
      return groupsWithCourseNames as LearningGroup[];
    },
  });

  return {
    groups: groups || [],
    isLoading,
    error,
  };
};

export const useCreateLearningGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (groupData: Omit<LearningGroup, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('learning_groups')
        .insert([groupData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-groups'] });
    },
  });
};

export const useUpdateLearningGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LearningGroup> }) => {
      const { error } = await supabase
        .from('learning_groups')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-groups'] });
    },
  });
};

export const useDeleteLearningGroup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('learning_groups')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-groups'] });
    },
  });
};

// Helper functions for dropdowns
export const getUniqueValues = (groups: LearningGroup[], field: keyof LearningGroup): string[] => {
  const values = groups
    .map(group => group[field])
    .filter(Boolean)
    .filter((value, index, self) => self.indexOf(value) === index);
  
  return values as string[];
};

export const formatSchedule = (days?: string[], time?: string): string => {
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

export const getStatusColor = (status: string): string => {
  const colors = {
    'reserve': 'bg-gray-100 text-gray-800',
    'forming': 'bg-yellow-100 text-yellow-800',
    'active': 'bg-green-100 text-green-800',
    'suspended': 'bg-red-100 text-red-800',
    'finished': 'bg-blue-100 text-blue-800'
  };
  
  return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
};

export const getCategoryLabel = (category: string): string => {
  const labels = {
    'preschool': 'Дошкольники',
    'school': 'Школьники', 
    'adult': 'Взрослые',
    'all': 'Все'
  };
  
  return labels[category as keyof typeof labels] || category;
};

export const getStatusLabel = (status: string): string => {
  const labels = {
    'reserve': 'Резервные',
    'forming': 'Формирующиеся',
    'active': 'В работе',
    'suspended': 'Приостановленные',
    'finished': 'Законченные'
  };
  
  return labels[status as keyof typeof labels] || status;
};