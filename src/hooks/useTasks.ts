import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

export interface Task {
  id: string;
  client_id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'cancelled';
  due_date?: string;
  responsible?: string;
  goal?: string;
  method?: string;
  direction?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskData {
  client_id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  responsible?: string;
  goal?: string;
  method?: string;
  direction?: string;
}

export const useTasks = (clientId?: string) => {
  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['tasks', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!clientId,
  });

  return {
    tasks: tasks || [],
    isLoading,
    error,
  };
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (taskData: CreateTaskData) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success("Задача создана");
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      toast.error("Ошибка при создании задачи");
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success("Задача обновлена");
    },
    onError: (error) => {
      console.error('Error updating task:', error);
      toast.error("Ошибка при обновлении задачи");
    },
  });
};

export const useCompleteTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (taskId: string) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', taskId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success("Задача выполнена");
    },
    onError: (error) => {
      console.error('Error completing task:', error);
      toast.error("Ошибка при выполнении задачи");
    },
  });
};

export const useCancelTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (taskId: string) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status: 'cancelled' })
        .eq('id', taskId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success("Задача отменена");
    },
    onError: (error) => {
      console.error('Error cancelling task:', error);
      toast.error("Ошибка при отмене задачи");
    },
  });
};