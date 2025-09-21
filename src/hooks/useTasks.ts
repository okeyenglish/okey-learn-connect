import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

export interface Task {
  id: string;
  client_id?: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'cancelled';
  due_date?: string;
  due_time?: string;
  responsible?: string;
  goal?: string;
  method?: string;
  direction?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskData {
  client_id?: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  due_time?: string;
  responsible?: string;
  goal?: string;
  method?: string;
  direction?: string;
}

export const useTasks = (clientId?: string) => {
  const queryClient = useQueryClient();
  
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

  // Real-time subscription for tasks
  useEffect(() => {
    if (!clientId) return;

    const channel = supabase
      .channel(`tasks-${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tasks', clientId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, queryClient]);

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
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      toast.success("Задача создана");
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      toast.error("Ошибка при создании задачи");
    },
  });
};

// Новый хук для получения всех активных задач с информацией о клиентах
export const useAllTasks = () => {
  const queryClient = useQueryClient();
  
  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: async () => {
      // Сначала получаем задачи
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (tasksError) throw tasksError;
      if (!tasksData || tasksData.length === 0) return [];

      // Получаем уникальные client_id (исключаем null)
      const clientIds = [...new Set(tasksData.map(task => task.client_id).filter(Boolean))];
      
      let clientsData = [];
      if (clientIds.length > 0) {
        // Получаем информацию о клиентах
        const { data: clients, error: clientsError } = await supabase
          .from('clients')
          .select('id, name, phone')
          .in('id', clientIds);
        
        if (clientsError) throw clientsError;
        clientsData = clients || [];
      }
      
      // Соединяем данные
      const tasksWithClients = tasksData.map(task => ({
        ...task,
        clients: task.client_id ? clientsData?.find(client => client.id === task.client_id) || null : null
      }));
      
      return tasksWithClients;
    },
  });

  // Real-time subscription for all tasks
  useEffect(() => {
    const channel = supabase
      .channel('all-tasks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    tasks: tasks || [],
    isLoading,
    error,
  };
};

// Новый хук для получения задач по дате
export const useTasksByDate = (date?: string) => {
  const queryClient = useQueryClient();
  
  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['tasks-by-date', date],
    queryFn: async () => {
      if (!date) return [];
      
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'active')
        .eq('due_date', date)
        .order('due_time', { ascending: true, nullsFirst: false });
      
      if (tasksError) throw tasksError;
      if (!tasksData || tasksData.length === 0) return [];

      // Получаем информацию о клиентах для задач с client_id
      const clientIds = [...new Set(tasksData.map(task => task.client_id).filter(Boolean))];
      
      let clientsData = [];
      if (clientIds.length > 0) {
        const { data: clients, error: clientsError } = await supabase
          .from('clients')
          .select('id, name, phone')
          .in('id', clientIds);
        
        if (clientsError) throw clientsError;
        clientsData = clients || [];
      }
      
      // Соединяем данные
      const tasksWithClients = tasksData.map(task => ({
        ...task,
        clients: task.client_id ? clientsData?.find(client => client.id === task.client_id) || null : null
      }));
      
      return tasksWithClients;
    },
    enabled: !!date,
  });

  // Real-time subscription for tasks by date
  useEffect(() => {
    if (!date) return;

    const channel = supabase
      .channel(`tasks-by-date-${date}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `due_date=eq.${date}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tasks-by-date', date] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [date, queryClient]);

  return {
    tasks: tasks || [],
    isLoading,
    error,
  };
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
    // Оптимистичное обновление для мгновенного UI-эффекта
    onMutate: async (variables: Partial<Task> & { id: string }) => {
      await queryClient.cancelQueries({ queryKey: ['all-tasks'] });
      const previousAll = queryClient.getQueryData<any[]>(['all-tasks']);
      if (previousAll) {
        const nextAll = previousAll.map((t) =>
          t.id === variables.id ? { ...t, ...variables } : t
        );
        queryClient.setQueryData(['all-tasks'], nextAll);
      }
      return { previousAll };
    },
    onError: (error, _vars, context) => {
      console.error('Error updating task:', error);
      if (context?.previousAll) {
        queryClient.setQueryData(['all-tasks'], context.previousAll);
      }
      toast.error("Ошибка при обновлении задачи");
    },
    onSuccess: () => {
      // Инвалидируем все связанные кэши
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-by-date'] });
      toast.success("Задача обновлена");
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
    onMutate: async (taskId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      
      // Optimistically update the tasks
      const queryKeys = [
        ['tasks'],
        ['all-tasks'],
        ['tasks-by-date']
      ];
      
      queryKeys.forEach(key => {
        queryClient.setQueriesData({ queryKey: key }, (old: any) => {
          if (!old) return old;
          if (Array.isArray(old)) {
            return old.filter((task: any) => task.id !== taskId);
          }
          return old;
        });
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success("Задача выполнена");
    },
    onError: (error, taskId) => {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
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
    onMutate: async (taskId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      
      // Optimistically update the tasks
      const queryKeys = [
        ['tasks'],
        ['all-tasks'],
        ['tasks-by-date']
      ];
      
      queryKeys.forEach(key => {
        queryClient.setQueriesData({ queryKey: key }, (old: any) => {
          if (!old) return old;
          if (Array.isArray(old)) {
            return old.filter((task: any) => task.id !== taskId);
          }
          return old;
        });
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success("Задача отменена");
    },
    onError: (error, taskId) => {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      console.error('Error cancelling task:', error);
      toast.error("Ошибка при отмене задачи");
    },
  });
};