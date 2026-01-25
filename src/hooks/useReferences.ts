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
    queryFn: async (): Promise<Subject[]> => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as Subject[];
    }
  });
};

export const useCreateSubject = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (subjectData: Omit<Subject, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('subjects')
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
    onError: (error: Error) => {
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
      const { data, error } = await supabase
        .from('subjects')
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
    onError: (error: Error) => {
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
      const { error } = await supabase
        .from('subjects')
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
    onError: (error: Error) => {
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
    queryFn: async (): Promise<ProficiencyLevel[]> => {
      const { data, error } = await supabase
        .from('proficiency_levels')
        .select('*')
        .order('level_order', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as ProficiencyLevel[];
    }
  });
};

export const useCreateProficiencyLevel = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (levelData: Omit<ProficiencyLevel, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('proficiency_levels')
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
    onError: (error: Error) => {
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
    queryFn: async (): Promise<LearningFormat[]> => {
      const { data, error } = await supabase
        .from('learning_formats')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as LearningFormat[];
    }
  });
};

// Хуки для возрастных категорий
export const useAgeCategories = () => {
  return useQuery({
    queryKey: ['age-categories'],
    queryFn: async (): Promise<AgeCategory[]> => {
      const { data, error } = await supabase
        .from('age_categories')
        .select('*')
        .order('min_age', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as AgeCategory[];
    }
  });
};

// Хуки для причин пропусков
export const useAbsenceReasons = () => {
  return useQuery({
    queryKey: ['absence-reasons'],
    queryFn: async (): Promise<AbsenceReason[]> => {
      const { data, error } = await supabase
        .from('absence_reasons')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as AbsenceReason[];
    }
  });
};

// Хуки для аудиторий
export const useClassrooms = () => {
  return useQuery({
    queryKey: ['classrooms'],
    queryFn: async (): Promise<Classroom[]> => {
      const { data, error } = await supabase
        .from('classrooms')
        .select('*')
        .order('branch', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as Classroom[];
    }
  });
};

export const useCreateClassroom = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (classroomData: Omit<Classroom, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('classrooms')
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
    onError: (error: Error) => {
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
      const { data, error } = await supabase
        .from('classrooms')
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
    onError: (error: Error) => {
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
      const { error } = await supabase
        .from('classrooms')
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
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить аудиторию",
        variant: "destructive"
      });
    }
  });
};
