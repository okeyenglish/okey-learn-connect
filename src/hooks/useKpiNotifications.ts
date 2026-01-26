import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { KpiNotification } from "@/types/kpi";

export const useKpiNotifications = (profileId?: string) => {
  return useQuery({
    queryKey: ['kpi-notifications', profileId],
    queryFn: async (): Promise<KpiNotification[]> => {
      let query = supabase
        .from('kpi_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (profileId) {
        query = query.eq('profile_id', profileId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as KpiNotification[];
    },
  });
};

export const useUnreadKpiNotificationsCount = () => {
  return useQuery({
    queryKey: ['kpi-notifications-unread-count'],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('kpi_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    },
  });
};

export const useMarkKpiNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('kpi_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['kpi-notifications-unread-count'] });
    },
  });
};

export const useMarkAllKpiNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('kpi_notifications')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['kpi-notifications-unread-count'] });
    },
  });
};

export const useCreateKpiNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      profile_id: string;
      organization_id: string;
      notification_type: 'low_score' | 'low_calls' | 'low_answered_rate';
      message: string;
      current_value?: number;
      threshold_value?: number;
    }) => {
      const { error } = await supabase
        .from('kpi_notifications')
        .insert(params);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['kpi-notifications-unread-count'] });
    },
  });
};
