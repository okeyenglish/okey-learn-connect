import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  recipient_id: string;
  recipient_type: string;
  title: string;
  message: string;
  notification_type: string;
  status: string;
  scheduled_at?: string;
  sent_at?: string;
  read_at?: string;
  delivery_method: string[];
  metadata: any;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface BroadcastCampaign {
  id: string;
  name: string;
  title: string;
  message: string;
  target_audience: string;
  filters: any;
  delivery_method: string[];
  status: string;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Получить уведомления пользователя
export const useUserNotifications = (userId?: string) => {
  return useQuery({
    queryKey: ['user-notifications', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('notifications' as any)
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as unknown as Notification[];
    },
    enabled: !!userId,
  });
};

// Получить все уведомления (для админов)
export const useAllNotifications = (filters?: {
  status?: string;
  type?: string;
}) => {
  return useQuery({
    queryKey: ['all-notifications', filters],
    queryFn: async () => {
      let query = supabase
        .from('notifications' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.type) {
        query = query.eq('notification_type', filters.type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as Notification[];
    },
  });
};

// Создать уведомление
export const useCreateNotification = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (notification: Partial<Notification>) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('notifications' as any)
        .insert({
          ...notification,
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
      toast({
        title: 'Успешно',
        description: 'Уведомление создано',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// Отметить как прочитанное
export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications' as any)
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
    },
  });
};

// Получить рассылки
export const useBroadcastCampaigns = (filters?: { status?: string }) => {
  return useQuery({
    queryKey: ['broadcast-campaigns', filters],
    queryFn: async () => {
      let query = supabase
        .from('broadcast_campaigns' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as BroadcastCampaign[];
    },
  });
};

// Создать рассылку
export const useCreateBroadcastCampaign = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (campaign: Partial<BroadcastCampaign>) => {
      const { data: user } = await supabase.auth.getUser();

      // Получаем получателей
      const { data: recipients, error: recipientsError } = await supabase.rpc(
        'get_campaign_recipients' as any,
        {
          p_target_audience: campaign.target_audience,
          p_filters: campaign.filters || {},
        }
      );

      if (recipientsError) throw recipientsError;

      const { data, error } = await supabase
        .from('broadcast_campaigns' as any)
        .insert({
          ...campaign,
          total_recipients: recipients?.length || 0,
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcast-campaigns'] });
      toast({
        title: 'Успешно',
        description: 'Рассылка создана',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// Запустить рассылку
export const useLaunchCampaign = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      // Получаем данные кампании
      const { data: campaign, error: campaignError } = await supabase
        .from('broadcast_campaigns' as any)
        .select('*')
        .eq('id', campaignId)
        .maybeSingle();

      if (campaignError) throw campaignError;
      if (!campaign) throw new Error('Кампания не найдена');

      const campaignData = campaign as any;

      // Получаем получателей
      const { data: recipients, error: recipientsError } = await supabase.rpc(
        'get_campaign_recipients' as any,
        {
          p_target_audience: campaignData.target_audience,
          p_filters: campaignData.filters || {},
        }
      );

      if (recipientsError) throw recipientsError;

      const { data: user } = await supabase.auth.getUser();

      // Создаём уведомления для всех получателей
      const notifications = (recipients || []).map((recipient: any) => ({
        recipient_id: recipient.user_id,
        recipient_type: 'student',
        title: campaignData.title,
        message: campaignData.message,
        notification_type: 'broadcast',
        status: 'sent',
        delivery_method: campaignData.delivery_method,
        sent_at: new Date().toISOString(),
        created_by: user.user?.id,
        metadata: { campaign_id: campaignId },
      }));

      const { error: notificationsError } = await supabase
        .from('notifications' as any)
        .insert(notifications);

      if (notificationsError) throw notificationsError;

      // Обновляем статус кампании
      const { error: updateError } = await supabase
        .from('broadcast_campaigns' as any)
        .update({
          status: 'completed',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          sent_count: notifications.length,
          delivered_count: notifications.length,
        })
        .eq('id', campaignId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcast-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
      toast({
        title: 'Успешно',
        description: 'Рассылка отправлена',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// Удалить рассылку
export const useDeleteCampaign = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from('broadcast_campaigns' as any)
        .delete()
        .eq('id', campaignId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcast-campaigns'] });
      toast({
        title: 'Успешно',
        description: 'Рассылка удалена',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
