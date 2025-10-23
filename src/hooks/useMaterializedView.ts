import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Хуки для работы с материализованными представлениями
 */

// Статистика непрочитанных сообщений по клиентам
export function useClientUnreadStats(branch?: string): UseQueryResult<any[], Error> {
  return useQuery({
    queryKey: ['mv_client_unread_stats', branch],
    staleTime: 5 * 60 * 1000, // 5 минут
    queryFn: async () => {
      let query = supabase
        .from('mv_client_unread_stats' as any)
        .select('*')
        .order('unread_count', { ascending: false });
      
      if (branch && branch !== 'all') {
        query = query.eq('branch', branch);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
  });
}

// Статистика задач по клиентам
export function useClientTasksStats(clientId?: string): UseQueryResult<any[], Error> {
  return useQuery({
    queryKey: ['mv_client_tasks_stats', clientId],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      let query = supabase
        .from('mv_client_tasks_stats' as any)
        .select('*');
      
      if (clientId) {
        query = query.eq('client_id', clientId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
  });
}

// Статистика по группам
export function useGroupStats(branch?: string, status?: string): UseQueryResult<any[], Error> {
  return useQuery({
    queryKey: ['mv_group_stats', branch, status],
    staleTime: 10 * 60 * 1000, // 10 минут
    queryFn: async () => {
      let query = supabase
        .from('mv_group_stats' as any)
        .select('*');
      
      if (branch && branch !== 'all') {
        query = query.eq('branch', branch);
      }
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
  });
}

// Обзор расписания
export function useScheduleOverview(filters?: {
  branch?: string;
  teacherName?: string;
  startDate?: string;
  endDate?: string;
}): UseQueryResult<any[], Error> {
  return useQuery({
    queryKey: ['mv_schedule_overview', filters],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      let query = supabase
        .from('mv_schedule_overview' as any)
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
      return data || [];
    },
  });
}

// Обзор студентов
export function useStudentOverview(filters?: {
  branch?: string;
  status?: string;
  hasDebt?: boolean;
}): UseQueryResult<any[], Error> {
  return useQuery({
    queryKey: ['mv_student_overview', filters],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      let query = supabase
        .from('mv_student_overview' as any)
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
      return data || [];
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
      // Вызываем функцию обновления через raw SQL
      const { error } = await supabase.rpc('refresh_all_materialized_views' as any);
      
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
 */
import { useEffect } from 'react';

export function useAutoRefreshMaterializedViews(intervalMinutes: number = 5) {
  const { mutate: refresh } = useRefreshMaterializedViews();
  
  useEffect(() => {
    // Обновляем при монтировании
    refresh();
    
    // Затем обновляем по расписанию
    const interval = setInterval(() => {
      refresh();
    }, intervalMinutes * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [refresh, intervalMinutes]);
}
