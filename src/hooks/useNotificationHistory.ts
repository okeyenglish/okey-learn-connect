import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';

export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'cancelled';
export type NotificationType = 'lesson_reminder' | 'schedule_change' | 'payment_reminder' | 'homework' | 'attendance' | 'custom' | 'system';
export type RecipientType = 'teacher' | 'parent' | 'student' | 'client' | 'staff';
export type NotificationChannel = 'whatsapp' | 'telegram' | 'max' | 'chatos' | 'email' | 'push' | 'sms';

export interface NotificationHistoryItem {
  id: string;
  organization_id: string;
  recipient_type: RecipientType;
  recipient_id: string | null;
  recipient_name: string;
  recipient_contact: string | null;
  channel: NotificationChannel;
  notification_type: NotificationType;
  lesson_session_id: string | null;
  group_id: string | null;
  student_id: string | null;
  title: string;
  message_text: string;
  status: NotificationStatus;
  status_details: string | null;
  external_message_id: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationHistoryFilters {
  recipientType?: RecipientType;
  recipientId?: string;
  channel?: NotificationChannel;
  notificationType?: NotificationType;
  status?: NotificationStatus;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

/**
 * Hook to fetch notification history with filters
 */
export const useNotificationHistory = (filters: NotificationHistoryFilters = {}) => {
  return useQuery({
    queryKey: ['notification-history', filters],
    queryFn: async () => {
      let query = supabase
        .from('notification_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.recipientType) {
        query = query.eq('recipient_type', filters.recipientType);
      }
      if (filters.recipientId) {
        query = query.eq('recipient_id', filters.recipientId);
      }
      if (filters.channel) {
        query = query.eq('channel', filters.channel);
      }
      if (filters.notificationType) {
        query = query.eq('notification_type', filters.notificationType);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      query = query.limit(filters.limit || 100);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notification history:', error);
        throw error;
      }

      return (data || []) as NotificationHistoryItem[];
    },
    staleTime: 30_000,
  });
};

/**
 * Hook to fetch notification history for a specific teacher
 */
export const useTeacherNotificationHistory = (teacherId: string, limit = 50) => {
  return useNotificationHistory({
    recipientType: 'teacher',
    recipientId: teacherId,
    limit,
  });
};

/**
 * Hook to fetch notification history for a specific student's parents
 */
export const useParentNotificationHistory = (studentId: string, limit = 50) => {
  return useQuery({
    queryKey: ['notification-history-parent', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_history')
        .select('*')
        .eq('student_id', studentId)
        .eq('recipient_type', 'parent')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching parent notification history:', error);
        throw error;
      }

      return (data || []) as NotificationHistoryItem[];
    },
    enabled: !!studentId,
    staleTime: 30_000,
  });
};

/**
 * Hook to get notification statistics
 */
export const useNotificationStats = (filters: NotificationHistoryFilters = {}) => {
  return useQuery({
    queryKey: ['notification-stats', filters],
    queryFn: async () => {
      let query = supabase
        .from('notification_history')
        .select('status, channel, notification_type');

      if (filters.recipientType) {
        query = query.eq('recipient_type', filters.recipientType);
      }
      if (filters.recipientId) {
        query = query.eq('recipient_id', filters.recipientId);
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notification stats:', error);
        return { total: 0, sent: 0, delivered: 0, failed: 0, byChannel: {}, byType: {} };
      }

      const items = data || [];
      const stats = {
        total: items.length,
        sent: items.filter(i => i.status === 'sent').length,
        delivered: items.filter(i => i.status === 'delivered' || i.status === 'read').length,
        failed: items.filter(i => i.status === 'failed').length,
        byChannel: {} as Record<string, number>,
        byType: {} as Record<string, number>,
      };

      for (const item of items) {
        stats.byChannel[item.channel] = (stats.byChannel[item.channel] || 0) + 1;
        stats.byType[item.notification_type] = (stats.byType[item.notification_type] || 0) + 1;
      }

      return stats;
    },
    staleTime: 60_000,
  });
};

/**
 * Hook to log a new notification
 */
export const useLogNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notification: Omit<NotificationHistoryItem, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('notification_history')
        .insert(notification)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-history'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
    },
  });
};

/**
 * Hook to update notification status
 */
export const useUpdateNotificationStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      statusDetails,
      externalMessageId,
    }: { 
      id: string; 
      status: NotificationStatus; 
      statusDetails?: string;
      externalMessageId?: string;
    }) => {
      const updateData: Record<string, unknown> = { status };
      
      if (statusDetails) updateData.status_details = statusDetails;
      if (externalMessageId) updateData.external_message_id = externalMessageId;
      
      // Set appropriate timestamp based on status
      const now = new Date().toISOString();
      if (status === 'sent') updateData.sent_at = now;
      if (status === 'delivered') updateData.delivered_at = now;
      if (status === 'read') updateData.read_at = now;
      if (status === 'failed') updateData.failed_at = now;

      const { error } = await supabase
        .from('notification_history')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-history'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
    },
  });
};
