import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { useEffect } from 'react';
import type { CustomDatabase } from '@/integrations/supabase/database.types';

/**
 * Хуки для работы с материализованными представлениями
 */

type ClientUnreadStats = CustomDatabase['public']['Views']['mv_client_unread_stats']['Row'];
type ClientTasksStats = CustomDatabase['public']['Views']['mv_client_tasks_stats']['Row'];
type GroupStats = CustomDatabase['public']['Views']['mv_group_stats']['Row'];
type ScheduleOverview = CustomDatabase['public']['Views']['mv_schedule_overview']['Row'];
type StudentOverview = CustomDatabase['public']['Views']['mv_student_overview']['Row'];

// Статистика непрочитанных сообщений по клиентам
export function useClientUnreadStats(branch?: string): UseQueryResult<ClientUnreadStats[], Error> {
  return useQuery({
    queryKey: ['mv_client_unread_stats', branch],
    staleTime: 5 * 60 * 1000, // 5 минут
    queryFn: async () => {
      let query = supabase
        .from('mv_client_unread_stats')
        .select('*')
        .order('unread_count', { ascending: false });
      
      if (branch && branch !== 'all') {
        query = query.eq('branch', branch);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as ClientUnreadStats[];
    },
  });
}

// Статистика задач по клиентам
export function useClientTasksStats(clientId?: string): UseQueryResult<ClientTasksStats[], Error> {
  return useQuery({
    queryKey: ['mv_client_tasks_stats', clientId],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      let query = supabase
        .from('mv_client_tasks_stats')
        .select('*');
      
      if (clientId) {
        query = query.eq('client_id', clientId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as ClientTasksStats[];
    },
  });
}

// Статистика по группам
export function useGroupStats(branch?: string, status?: string): UseQueryResult<GroupStats[], Error> {
  return useQuery({
    queryKey: ['mv_group_stats', branch, status],
    staleTime: 10 * 60 * 1000, // 10 минут
    queryFn: async () => {
      let query = supabase
        .from('mv_group_stats')
        .select('*');
      
      if (branch && branch !== 'all') {
        query = query.eq('branch', branch);
      }
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as GroupStats[];
    },
  });
}

// Обзор расписания
export function useScheduleOverview(filters?: {
  branch?: string;
  teacherName?: string;
  startDate?: string;
  endDate?: string;
}): UseQueryResult<ScheduleOverview[], Error> {
  return useQuery({
    queryKey: ['mv_schedule_overview', filters],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      let query = supabase
        .from('mv_schedule_overview')
        .select('*')
        .order('lesson_date', { ascending: true })
        .order('start_time', { ascending: true });
      
      if (filters?.branch && filters.branch !== 'all') {
        query = query.eq('branch', filters.branch);
      }
      
      if (filters?.teacherName) {
        query = query.eq('teacher_name', filters.teacherName);
      }
      
      if (filters?.startDate) {
        query = query.gte('lesson_date', filters.startDate);
      }
      
      if (filters?.endDate) {
        query = query.lte('lesson_date', filters.endDate);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as ScheduleOverview[];
    },
  });
}

// Обзор студентов
export function useStudentOverview(filters?: {
  branch?: string;
  status?: string;
  hasDebt?: boolean;
}): UseQueryResult<StudentOverview[], Error> {
  return useQuery({
    queryKey: ['mv_student_overview', filters],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      let query = supabase
        .from('mv_student_overview')
        .select('*')
        .order('name', { ascending: true });
      
      if (filters?.branch && filters.branch !== 'all') {
        query = query.eq('branch', filters.branch);
      }
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.hasDebt !== undefined) {
        query = query.eq('has_debt', filters.hasDebt);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as StudentOverview[];
    },
  });
}

/**
 * Мутация для обновления всех материализованных представлений
 * Примечание: Требует создания функции refresh_all_materialized_views в БД
 */
export function useRefreshMaterializedViews() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      // Вызываем функцию обновления через RPC
      const { error } = await supabase.rpc('refresh_all_materialized_views');
      
      if (error) {
        console.warn('[MV] Refresh function not available, views will be refreshed automatically');
        throw error;
      }
      
      return { success: true };
    },
    onSuccess: () => {
      // Инвалидируем все запросы к материализованным представлениям
      queryClient.invalidateQueries({ queryKey: ['mv_client_unread_stats'] });
      queryClient.invalidateQueries({ queryKey: ['mv_client_tasks_stats'] });
      queryClient.invalidateQueries({ queryKey: ['mv_group_stats'] });
      queryClient.invalidateQueries({ queryKey: ['mv_schedule_overview'] });
      queryClient.invalidateQueries({ queryKey: ['mv_student_overview'] });
      
      console.log('[Materialized Views] Refreshed successfully');
    },
    onError: (error) => {
      console.error('[Materialized Views] Refresh failed:', error);
    },
  });
}

/**
 * Hook для автоматического обновления материализованных представлений по расписанию
 * OPTIMIZED: 5 мин → 15 мин + проверка visibilityState
 */
export function useAutoRefreshMaterializedViews(intervalMinutes: number = 15) {
  const { mutate: refresh } = useRefreshMaterializedViews();
  
  useEffect(() => {
    const doRefresh = () => {
      // Обновляем только если вкладка активна - избегаем лишней нагрузки в фоне
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };
    
    // Обновляем при монтировании
    doRefresh();
    
    // Затем обновляем по расписанию
    const interval = setInterval(doRefresh, intervalMinutes * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [refresh, intervalMinutes]);
}
