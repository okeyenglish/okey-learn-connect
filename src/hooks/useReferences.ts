import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useToast } from '@/hooks/use-toast';

// Типы для справочников
export interface Subject {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProficiencyLevel {
  id: string;
  name: string;
  description?: string;
  level_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LearningFormat {
  id: string;
  name: string;
  description?: string;
  is_online: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgeCategory {
  id: string;
  name: string;
  min_age?: number;
  max_age?: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AbsenceReason {
  id: string;
  name: string;
  description?: string;
  payment_coefficient: number;
  is_excused: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Classroom {
  id: string;
  name: string;
  branch: string;
  capacity: number;
  equipment?: string[];
  is_online: boolean;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Хуки для предметов
export const useSubjects = () => {
  return useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('subjects' as any) as any)
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as Subject[];
    }
  });
};

export const useCreateSubject = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (subjectData: Omit<Subject, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await (supabase
        .from('subjects' as any) as any)
        .insert(subjectData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast({
        title: "Предмет создан",
        description: "Новый предмет успешно добавлен"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать предмет",
        variant: "destructive"
      });
    }
  });
};

export const useUpdateSubject = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (subjectData: Partial<Subject> & { id: string }) => {
      const { data, error } = await (supabase
        .from('subjects' as any) as any)
        .update(subjectData)
        .eq('id', subjectData.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast({
        title: "Предмет обновлен",
        description: "Изменения успешно сохранены"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить предмет",
        variant: "destructive"
      });
    }
  });
};

export const useDeleteSubject = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('subjects' as any) as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast({
        title: "Предмет удален",
        description: "Предмет успешно удален"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить предмет",
        variant: "destructive"
      });
    }
  });
};

// Хуки для уровней подготовки
export const useProficiencyLevels = () => {
  return useQuery({
    queryKey: ['proficiency-levels'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('proficiency_levels' as any) as any)
        .select('*')
        .order('level_order', { ascending: true });

      if (error) throw error;
      return data as ProficiencyLevel[];
    }
  });
};

export const useCreateProficiencyLevel = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (levelData: Omit<ProficiencyLevel, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await (supabase
        .from('proficiency_levels' as any) as any)
        .insert(levelData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proficiency-levels'] });
      toast({
        title: "Уровень создан",
        description: "Новый уровень подготовки успешно добавлен"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать уровень",
        variant: "destructive"
      });
    }
  });
};

// Хуки для форм обучения
export const useLearningFormats = () => {
  return useQuery({
    queryKey: ['learning-formats'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('learning_formats' as any) as any)
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as LearningFormat[];
    }
  });
};

// Хуки для возрастных категорий
export const useAgeCategories = () => {
  return useQuery({
    queryKey: ['age-categories'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('age_categories' as any) as any)
        .select('*')
        .order('min_age', { ascending: true });

      if (error) throw error;
      return data as AgeCategory[];
    }
  });
};

// Хуки для причин пропусков
export const useAbsenceReasons = () => {
  return useQuery({
    queryKey: ['absence-reasons'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('absence_reasons' as any) as any)
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as AbsenceReason[];
    }
  });
};

// Хуки для аудиторий
export const useClassrooms = () => {
  return useQuery({
    queryKey: ['classrooms'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('classrooms' as any) as any)
        .select('*')
        .order('branch', { ascending: true });

      if (error) throw error;
      return data as Classroom[];
    }
  });
};

export const useCreateClassroom = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (classroomData: Omit<Classroom, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await (supabase
        .from('classrooms' as any) as any)
        .insert(classroomData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      toast({
        title: "Аудитория создана",
        description: "Новая аудитория успешно добавлена"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать аудиторию",
        variant: "destructive"
      });
    }
  });
};

export const useUpdateClassroom = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (classroomData: Partial<Classroom> & { id: string }) => {
      const { data, error } = await (supabase
        .from('classrooms' as any) as any)
        .update(classroomData)
        .eq('id', classroomData.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      toast({
        title: "Аудитория обновлена",
        description: "Изменения успешно сохранены"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить аудиторию",
        variant: "destructive"
      });
    }
  });
};

export const useDeleteClassroom = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('classrooms' as any) as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      toast({
        title: "Аудитория удалена",
        description: "Аудитория успешно удалена"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить аудиторию",
        variant: "destructive"
      });
    }
  });
};
