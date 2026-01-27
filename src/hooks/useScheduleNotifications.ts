import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export interface ScheduleChangeNotification {
  teacherId: string;
  teacherName: string;
  teacherPhone?: string;
  teacherEmail?: string;
  sessionId: string;
  groupName?: string;
  changeType: 'created' | 'updated' | 'cancelled' | 'rescheduled';
  oldDate?: string;
  newDate?: string;
  oldTime?: string;
  newTime?: string;
  oldClassroom?: string;
  newClassroom?: string;
  notes?: string;
}

export interface TeacherNotificationPreferences {
  whatsapp_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  schedule_changes: boolean;
  notification_phone: string | null;
  notification_email: string | null;
}

export const useScheduleNotifications = () => {
  /**
   * Get teacher notification settings
   */
  const getTeacherNotificationSettings = useCallback(async (
    teacherId: string
  ): Promise<TeacherNotificationPreferences> => {
    const defaults: TeacherNotificationPreferences = {
      whatsapp_enabled: true,
      email_enabled: false,
      push_enabled: true,
      schedule_changes: true,
      notification_phone: null,
      notification_email: null,
    };

    try {
      const { data } = await supabase
        .from('teacher_notification_settings')
        .select('whatsapp_enabled, email_enabled, push_enabled, schedule_changes, notification_phone, notification_email')
        .eq('teacher_id', teacherId)
        .maybeSingle();

      if (data) {
        return {
          whatsapp_enabled: data.whatsapp_enabled ?? defaults.whatsapp_enabled,
          email_enabled: data.email_enabled ?? defaults.email_enabled,
          push_enabled: data.push_enabled ?? defaults.push_enabled,
          schedule_changes: data.schedule_changes ?? defaults.schedule_changes,
          notification_phone: data.notification_phone,
          notification_email: data.notification_email,
        };
      }
    } catch (error) {
      console.error('Error getting teacher notification settings:', error);
    }

    return defaults;
  }, []);

  /**
   * Get teacher contact info by teacher_id or teacher_name
   */
  const getTeacherContact = useCallback(async (
    teacherId?: string | null,
    teacherName?: string | null
  ): Promise<{ id: string; name: string; phone: string | null; email: string | null; profileId: string | null } | null> => {
    try {
      if (teacherId) {
        const { data } = await supabase
          .from('teachers')
          .select('id, first_name, last_name, phone, email, profile_id')
          .eq('id', teacherId)
          .maybeSingle();
        
        if (data) {
          return {
            id: data.id,
            name: `${data.first_name} ${data.last_name || ''}`.trim(),
            phone: data.phone,
            email: data.email,
            profileId: data.profile_id,
          };
        }
      }

      if (teacherName) {
        const nameParts = teacherName.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');

        let query = supabase
          .from('teachers')
          .select('id, first_name, last_name, phone, email, profile_id');

        if (lastName) {
          query = query.eq('first_name', firstName).eq('last_name', lastName);
        } else {
          query = query.eq('first_name', firstName);
        }

        const { data } = await query.maybeSingle();
        
        if (data) {
          return {
            id: data.id,
            name: `${data.first_name} ${data.last_name || ''}`.trim(),
            phone: data.phone,
            email: data.email,
            profileId: data.profile_id,
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting teacher contact:', error);
      return null;
    }
  }, []);

  /**
   * Format schedule change message for WhatsApp
   */
  const formatNotificationMessage = useCallback((notification: ScheduleChangeNotification): string => {
    const { changeType, groupName, oldDate, newDate, oldTime, newTime, oldClassroom, newClassroom, notes } = notification;

    const formatDate = (dateStr: string) => {
      try {
        return format(new Date(dateStr), 'd MMMM (EEEE)', { locale: ru });
      } catch {
        return dateStr;
      }
    };

    let message = `🔔 Изменение в расписании\n\n`;

    if (groupName) {
      message += `📚 Группа: ${groupName}\n`;
    }

    switch (changeType) {
      case 'created':
        message += `✅ Добавлено новое занятие\n`;
        if (newDate) message += `📅 Дата: ${formatDate(newDate)}\n`;
        if (newTime) message += `⏰ Время: ${newTime}\n`;
        if (newClassroom) message += `🏫 Аудитория: ${newClassroom}\n`;
        break;

      case 'cancelled':
        message += `❌ Занятие отменено\n`;
        if (oldDate) message += `📅 Дата: ${formatDate(oldDate)}\n`;
        if (oldTime) message += `⏰ Время: ${oldTime}\n`;
        break;

      case 'rescheduled':
        message += `🔄 Занятие перенесено\n\n`;
        
        if (oldDate && newDate && oldDate !== newDate) {
          message += `📅 Дата: ${formatDate(oldDate)} → ${formatDate(newDate)}\n`;
        } else if (newDate) {
          message += `📅 Дата: ${formatDate(newDate)}\n`;
        }
        
        if (oldTime && newTime && oldTime !== newTime) {
          message += `⏰ Время: ${oldTime} → ${newTime}\n`;
        } else if (newTime) {
          message += `⏰ Время: ${newTime}\n`;
        }
        
        if (oldClassroom && newClassroom && oldClassroom !== newClassroom) {
          message += `🏫 Аудитория: ${oldClassroom} → ${newClassroom}\n`;
        } else if (newClassroom) {
          message += `🏫 Аудитория: ${newClassroom}\n`;
        }
        break;

      case 'updated':
      default:
        message += `📝 Изменения в занятии\n`;
        
        if (oldDate && newDate && oldDate !== newDate) {
          message += `📅 Дата: ${formatDate(oldDate)} → ${formatDate(newDate)}\n`;
        } else if (newDate) {
          message += `📅 Дата: ${formatDate(newDate)}\n`;
        }
        
        if (oldTime && newTime && oldTime !== newTime) {
          message += `⏰ Время: ${oldTime} → ${newTime}\n`;
        } else if (newTime) {
          message += `⏰ Время: ${newTime}\n`;
        }
        
        if (oldClassroom && newClassroom && oldClassroom !== newClassroom) {
          message += `🏫 Аудитория: ${oldClassroom} → ${newClassroom}\n`;
        } else if (newClassroom) {
          message += `🏫 Аудитория: ${newClassroom}\n`;
        }
        break;
    }

    if (notes) {
      message += `\n📋 Примечание: ${notes}`;
    }

    return message;
  }, []);

  /**
   * Send notification via WhatsApp
   */
  const sendWhatsAppNotification = useCallback(async (
    phone: string,
    message: string
  ): Promise<boolean> => {
    try {
      const normalizedPhone = phone.replace(/\D/g, '');
      
      const response = await selfHostedPost<{ success: boolean }>('whatsapp-send', {
        phoneNumber: normalizedPhone,
        message,
        skipClientLookup: true
      });

      return response.success && response.data?.success === true;
    } catch (error) {
      console.error('Error sending WhatsApp notification:', error);
      return false;
    }
  }, []);

  /**
   * Send push notification to teacher
   */
  const sendPushNotification = useCallback(async (
    profileId: string,
    title: string,
    body: string
  ): Promise<boolean> => {
    try {
      const response = await selfHostedPost<{ success: boolean }>('send-push-notification', {
        userId: profileId,
        payload: {
          title,
          body,
          icon: '/pwa-192x192.png',
          url: '/teacher-portal?tab=schedule',
        }
      });

      return response.success && response.data?.success === true;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }, []);

  /**
   * Notify teacher about schedule change using their preferences
   */
  const notifyTeacherScheduleChange = useCallback(async (
    params: {
      teacherId?: string | null;
      teacherName?: string | null;
      sessionId: string;
      groupName?: string;
      changeType: 'created' | 'updated' | 'cancelled' | 'rescheduled';
      oldValues?: {
        lesson_date?: string;
        start_time?: string;
        classroom?: string;
      };
      newValues?: {
        lesson_date?: string;
        start_time?: string;
        classroom?: string;
      };
      notes?: string;
    }
  ): Promise<{ success: boolean; sent: boolean; channels: string[]; reason?: string }> => {
    const { teacherId, teacherName, sessionId, groupName, changeType, oldValues, newValues, notes } = params;

    // Get teacher contact
    const teacher = await getTeacherContact(teacherId, teacherName);
    
    if (!teacher) {
      return { success: true, sent: false, channels: [], reason: 'Преподаватель не найден' };
    }

    // Get teacher notification settings
    const settings = await getTeacherNotificationSettings(teacher.id);

    // Check if schedule changes are enabled
    if (!settings.schedule_changes) {
      return { success: true, sent: false, channels: [], reason: 'Уведомления об изменениях расписания отключены' };
    }

    // Format the notification
    const notification: ScheduleChangeNotification = {
      teacherId: teacher.id,
      teacherName: teacher.name,
      teacherPhone: settings.notification_phone || teacher.phone || undefined,
      teacherEmail: settings.notification_email || teacher.email || undefined,
      sessionId,
      groupName,
      changeType,
      oldDate: oldValues?.lesson_date,
      newDate: newValues?.lesson_date,
      oldTime: oldValues?.start_time,
      newTime: newValues?.start_time,
      oldClassroom: oldValues?.classroom,
      newClassroom: newValues?.classroom,
      notes
    };

    const message = formatNotificationMessage(notification);
    const channelsSent: string[] = [];

    // Send WhatsApp notification
    if (settings.whatsapp_enabled && notification.teacherPhone) {
      const sent = await sendWhatsAppNotification(notification.teacherPhone, message);
      if (sent) channelsSent.push('whatsapp');
    }

    // Send Push notification
    if (settings.push_enabled && teacher.profileId) {
      const title = changeType === 'cancelled' ? '❌ Занятие отменено' : '🔔 Изменение в расписании';
      const body = groupName ? `${groupName}: ${changeType === 'cancelled' ? 'отменено' : 'изменено'}` : 'Проверьте расписание';
      const sent = await sendPushNotification(teacher.profileId, title, body);
      if (sent) channelsSent.push('push');
    }

    // TODO: Email notifications can be added here when needed

    return { 
      success: true, 
      sent: channelsSent.length > 0,
      channels: channelsSent,
      reason: channelsSent.length === 0 ? 'Не удалось отправить уведомления' : undefined
    };
  }, [getTeacherContact, getTeacherNotificationSettings, formatNotificationMessage, sendWhatsAppNotification, sendPushNotification]);

  /**
   * Check if global notification settings allow sending
   */
  const checkNotificationSettings = useCallback(async (): Promise<boolean> => {
    try {
      const { data } = await supabase
        .from('messenger_settings')
        .select('is_enabled')
        .eq('messenger_type', 'whatsapp')
        .maybeSingle();

      return data?.is_enabled === true;
    } catch {
      return false;
    }
  }, []);

  return {
    notifyTeacherScheduleChange,
    getTeacherContact,
    getTeacherNotificationSettings,
    formatNotificationMessage,
    checkNotificationSettings
  };
};
