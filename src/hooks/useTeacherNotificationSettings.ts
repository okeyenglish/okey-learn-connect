import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type NotificationChannel = 'whatsapp' | 'telegram' | 'max' | 'internal_chat' | 'email' | 'push';

export interface TeacherNotificationSettings {
  id: string;
  teacher_id: string;
  organization_id: string;
  // Messenger channels
  whatsapp_enabled: boolean;
  telegram_enabled: boolean;
  max_enabled: boolean;
  internal_chat_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  // Preferred channel
  preferred_channel: NotificationChannel;
  // Notification types
  schedule_changes: boolean;
  lesson_reminders: boolean;
  reminder_minutes_before: number;
  // Contact overrides
  notification_phone: string | null;
  notification_email: string | null;
  notification_telegram_id: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export type TeacherNotificationSettingsInput = Partial<Omit<TeacherNotificationSettings, 'id' | 'created_at' | 'updated_at'>>;

const defaultSettings: Omit<TeacherNotificationSettings, 'id' | 'teacher_id' | 'organization_id' | 'created_at' | 'updated_at'> = {
  whatsapp_enabled: false,
  telegram_enabled: false,
  max_enabled: false,
  internal_chat_enabled: true,
  email_enabled: false,
  push_enabled: true,
  preferred_channel: 'internal_chat',
  schedule_changes: true,
  lesson_reminders: true,
  reminder_minutes_before: 60,
  notification_phone: null,
  notification_email: null,
  notification_telegram_id: null,
};

/**
 * Fetch notification settings for a specific teacher
 */
export const useTeacherNotificationSettings = (teacherId: string | undefined) => {
  return useQuery({
    queryKey: ['teacher-notification-settings', teacherId],
    queryFn: async () => {
      if (!teacherId) return null;

      const { data, error } = await supabase
        .from('teacher_notification_settings')
        .select('*')
        .eq('teacher_id', teacherId)
        .maybeSingle();

      if (error) {
        console.error('[useTeacherNotificationSettings] Error:', error);
        throw error;
      }

      return data as TeacherNotificationSettings | null;
    },
    enabled: !!teacherId,
  });
};

/**
 * Create or update notification settings for a teacher
 */
export const useUpsertTeacherNotificationSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teacherId,
      organizationId,
      settings,
    }: {
      teacherId: string;
      organizationId: string;
      settings: TeacherNotificationSettingsInput;
    }) => {
      const payload = {
        teacher_id: teacherId,
        organization_id: organizationId,
        ...defaultSettings,
        ...settings,
      };

      const { data, error } = await supabase
        .from('teacher_notification_settings')
        .upsert(payload, {
          onConflict: 'teacher_id',
        })
        .select()
        .single();

      if (error) {
        console.error('[useUpsertTeacherNotificationSettings] Error:', error);
        throw error;
      }

      return data as TeacherNotificationSettings;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['teacher-notification-settings', data.teacher_id] });
      toast.success('Настройки уведомлений сохранены');
    },
    onError: (error) => {
      console.error('[useUpsertTeacherNotificationSettings] Mutation error:', error);
      toast.error('Ошибка сохранения настроек уведомлений');
    },
  });
};

/**
 * Get effective notification settings for a teacher (with defaults)
 */
export const useEffectiveTeacherNotificationSettings = (teacherId: string | undefined) => {
  const { data, isLoading, error } = useTeacherNotificationSettings(teacherId);

  const effectiveSettings: Omit<TeacherNotificationSettings, 'id' | 'teacher_id' | 'organization_id' | 'created_at' | 'updated_at'> = data
    ? {
        whatsapp_enabled: data.whatsapp_enabled ?? defaultSettings.whatsapp_enabled,
        telegram_enabled: data.telegram_enabled ?? defaultSettings.telegram_enabled,
        max_enabled: data.max_enabled ?? defaultSettings.max_enabled,
        internal_chat_enabled: data.internal_chat_enabled ?? defaultSettings.internal_chat_enabled,
        email_enabled: data.email_enabled ?? defaultSettings.email_enabled,
        push_enabled: data.push_enabled ?? defaultSettings.push_enabled,
        preferred_channel: data.preferred_channel ?? defaultSettings.preferred_channel,
        schedule_changes: data.schedule_changes ?? defaultSettings.schedule_changes,
        lesson_reminders: data.lesson_reminders ?? defaultSettings.lesson_reminders,
        reminder_minutes_before: data.reminder_minutes_before ?? defaultSettings.reminder_minutes_before,
        notification_phone: data.notification_phone,
        notification_email: data.notification_email,
        notification_telegram_id: data.notification_telegram_id,
      }
    : defaultSettings;

  return {
    settings: effectiveSettings,
    rawData: data,
    isLoading,
    error,
    hasCustomSettings: !!data,
  };
};

/**
 * Get list of enabled channels for a teacher
 */
export const getEnabledChannels = (settings: TeacherNotificationSettingsInput): NotificationChannel[] => {
  const channels: NotificationChannel[] = [];
  if (settings.internal_chat_enabled) channels.push('internal_chat');
  if (settings.whatsapp_enabled) channels.push('whatsapp');
  if (settings.telegram_enabled) channels.push('telegram');
  if (settings.max_enabled) channels.push('max');
  if (settings.email_enabled) channels.push('email');
  if (settings.push_enabled) channels.push('push');
  return channels;
};

/**
 * Get channel display name
 */
export const getChannelDisplayName = (channel: NotificationChannel): string => {
  switch (channel) {
    case 'whatsapp': return 'WhatsApp';
    case 'telegram': return 'Telegram';
    case 'max': return 'MAX';
    case 'internal_chat': return 'Чат с организацией';
    case 'email': return 'Email';
    case 'push': return 'Push-уведомления';
    default: return channel;
  }
};