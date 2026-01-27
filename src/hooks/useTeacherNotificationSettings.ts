import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TeacherNotificationSettings {
  id: string;
  teacher_id: string;
  organization_id: string;
  whatsapp_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  schedule_changes: boolean;
  lesson_reminders: boolean;
  reminder_minutes_before: number;
  notification_phone: string | null;
  notification_email: string | null;
  created_at: string;
  updated_at: string;
}

export type TeacherNotificationSettingsInput = Partial<Omit<TeacherNotificationSettings, 'id' | 'created_at' | 'updated_at'>>;

const defaultSettings: Omit<TeacherNotificationSettings, 'id' | 'teacher_id' | 'organization_id' | 'created_at' | 'updated_at'> = {
  whatsapp_enabled: true,
  email_enabled: false,
  push_enabled: true,
  schedule_changes: true,
  lesson_reminders: true,
  reminder_minutes_before: 60,
  notification_phone: null,
  notification_email: null,
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
        whatsapp_enabled: data.whatsapp_enabled,
        email_enabled: data.email_enabled,
        push_enabled: data.push_enabled,
        schedule_changes: data.schedule_changes,
        lesson_reminders: data.lesson_reminders,
        reminder_minutes_before: data.reminder_minutes_before,
        notification_phone: data.notification_phone,
        notification_email: data.notification_email,
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
