import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface StaffActivityLog {
  id: string;
  organization_id: string;
  user_id: string;
  user_name: string | null;
  user_branch: string | null;
  action_type: string;
  action_label: string;
  target_type: string | null;
  target_id: string | null;
  target_name: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export type ActivityType = 
  | 'message_sent'
  | 'call_made'
  | 'call_received'
  | 'call_missed'
  | 'task_created'
  | 'task_completed'
  | 'invoice_created'
  | 'lead_status_changed'
  | 'student_created'
  | 'group_updated';

export const ACTIVITY_TYPE_CONFIG: Record<ActivityType, { label: string; icon: string; color: string }> = {
  message_sent: { label: 'Сообщение', icon: 'MessageSquare', color: 'text-blue-500' },
  call_made: { label: 'Исходящий звонок', icon: 'PhoneOutgoing', color: 'text-green-500' },
  call_received: { label: 'Входящий звонок', icon: 'PhoneIncoming', color: 'text-emerald-500' },
  call_missed: { label: 'Пропущенный', icon: 'PhoneMissed', color: 'text-red-500' },
  task_created: { label: 'Создал задачу', icon: 'ListPlus', color: 'text-purple-500' },
  task_completed: { label: 'Выполнил задачу', icon: 'CheckCircle', color: 'text-green-600' },
  invoice_created: { label: 'Выставил счёт', icon: 'Receipt', color: 'text-amber-500' },
  lead_status_changed: { label: 'Изменил статус', icon: 'ArrowRightLeft', color: 'text-orange-500' },
  student_created: { label: 'Создал ученика', icon: 'UserPlus', color: 'text-indigo-500' },
  group_updated: { label: 'Обновил группу', icon: 'Users', color: 'text-cyan-500' },
};

interface UseStaffActivityLogOptions {
  branches?: string[];
  actionTypes?: string[];
  userId?: string;
  limit?: number;
  enabled?: boolean;
}

export function useStaffActivityLog(options: UseStaffActivityLogOptions = {}) {
  const { user, profile } = useAuth();
  const { branches, actionTypes, userId, limit = 50, enabled = true } = options;
  const [realtimeActivities, setRealtimeActivities] = useState<StaffActivityLog[]>([]);

  const query = useQuery({
    queryKey: ['staff-activity-log', profile?.organization_id, branches, actionTypes, userId, limit],
    queryFn: async (): Promise<StaffActivityLog[]> => {
      if (!profile?.organization_id) return [];

      let queryBuilder = supabase
        .from('staff_activity_log')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Фильтр по филиалам
      if (branches && branches.length > 0 && !branches.includes('all')) {
        queryBuilder = queryBuilder.in('user_branch', branches);
      }

      // Фильтр по типам действий
      if (actionTypes && actionTypes.length > 0 && !actionTypes.includes('all')) {
        queryBuilder = queryBuilder.in('action_type', actionTypes);
      }

      // Фильтр по конкретному сотруднику
      if (userId) {
        queryBuilder = queryBuilder.eq('user_id', userId);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Error fetching staff activity log:', error);
        throw error;
      }

      return (data || []) as StaffActivityLog[];
    },
    enabled: enabled && !!user?.id && !!profile?.organization_id,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // Realtime подписка
  useEffect(() => {
    if (!profile?.organization_id || !enabled) return;

    const channel = supabase
      .channel('staff-activity-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'staff_activity_log',
          filter: `organization_id=eq.${profile.organization_id}`,
        },
        (payload) => {
          const newActivity = payload.new as StaffActivityLog;
          
          // Проверяем фильтры
          if (branches && branches.length > 0 && !branches.includes('all')) {
            if (!branches.includes(newActivity.user_branch || '')) return;
          }
          if (actionTypes && actionTypes.length > 0 && !actionTypes.includes('all')) {
            if (!actionTypes.includes(newActivity.action_type)) return;
          }
          if (userId && newActivity.user_id !== userId) return;

          setRealtimeActivities((prev) => [newActivity, ...prev].slice(0, limit));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.organization_id, branches, actionTypes, userId, limit, enabled]);

  // Объединяем realtime с загруженными данными
  const allActivities = [...realtimeActivities, ...(query.data || [])];
  
  // Удаляем дубликаты по id
  const uniqueActivities = allActivities.reduce((acc, activity) => {
    if (!acc.find((a) => a.id === activity.id)) {
      acc.push(activity);
    }
    return acc;
  }, [] as StaffActivityLog[]);

  // Сортируем по времени
  const sortedActivities = uniqueActivities
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);

  return {
    activities: sortedActivities,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
