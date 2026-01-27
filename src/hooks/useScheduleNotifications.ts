import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { NotificationChannel, getChannelDisplayName } from './useTeacherNotificationSettings';

export interface ScheduleChangeNotification {
  teacherId: string;
  teacherName: string;
  teacherPhone?: string;
  teacherEmail?: string;
  teacherTelegramId?: string;
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
  telegram_enabled: boolean;
  max_enabled: boolean;
  internal_chat_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  preferred_channel: NotificationChannel;
  schedule_changes: boolean;
  notification_phone: string | null;
  notification_email: string | null;
  notification_telegram_id: string | null;
}

export const useScheduleNotifications = () => {
  /**
   * Get teacher notification settings
   */
  const getTeacherNotificationSettings = useCallback(async (
    teacherId: string
  ): Promise<TeacherNotificationPreferences> => {
    const defaults: TeacherNotificationPreferences = {
      whatsapp_enabled: false,
      telegram_enabled: false,
      max_enabled: false,
      internal_chat_enabled: true,
      email_enabled: false,
      push_enabled: true,
      preferred_channel: 'internal_chat',
      schedule_changes: true,
      notification_phone: null,
      notification_email: null,
      notification_telegram_id: null,
    };

    try {
      const { data } = await supabase
        .from('teacher_notification_settings')
        .select('*')
        .eq('teacher_id', teacherId)
        .maybeSingle();

      if (data) {
        return {
          whatsapp_enabled: data.whatsapp_enabled ?? defaults.whatsapp_enabled,
          telegram_enabled: data.telegram_enabled ?? defaults.telegram_enabled,
          max_enabled: data.max_enabled ?? defaults.max_enabled,
          internal_chat_enabled: data.internal_chat_enabled ?? defaults.internal_chat_enabled,
          email_enabled: data.email_enabled ?? defaults.email_enabled,
          push_enabled: data.push_enabled ?? defaults.push_enabled,
          preferred_channel: data.preferred_channel ?? defaults.preferred_channel,
          schedule_changes: data.schedule_changes ?? defaults.schedule_changes,
          notification_phone: data.notification_phone,
          notification_email: data.notification_email,
          notification_telegram_id: data.notification_telegram_id,
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
  ): Promise<{ 
    id: string; 
    name: string; 
    phone: string | null; 
    email: string | null; 
    profileId: string | null;
    telegramId: string | null;
  } | null> => {
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
            telegramId: null, // Will be fetched from settings
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
            telegramId: null,
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
   * Format schedule change message
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
   * Send notification via Telegram
   */
  const sendTelegramNotification = useCallback(async (
    telegramId: string,
    message: string
  ): Promise<boolean> => {
    try {
      const response = await selfHostedPost<{ success: boolean }>('telegram-send', {
        chatId: telegramId,
        message,
      });
      return response.success && response.data?.success === true;
    } catch (error) {
      console.error('Error sending Telegram notification:', error);
      return false;
    }
  }, []);

  /**
   * Send notification via MAX
   */
  const sendMaxNotification = useCallback(async (
    phone: string,
    message: string
  ): Promise<boolean> => {
    try {
      const normalizedPhone = phone.replace(/\D/g, '');
      const response = await selfHostedPost<{ success: boolean }>('max-send', {
        phoneNumber: normalizedPhone,
        message,
      });
      return response.success && response.data?.success === true;
    } catch (error) {
      console.error('Error sending MAX notification:', error);
      return false;
    }
  }, []);

  /**
   * Send internal chat notification (assistant message to teacher)
   */
  const sendInternalChatNotification = useCallback(async (
    teacherProfileId: string,
    message: string
  ): Promise<boolean> => {
    try {
      // Create an assistant message for the teacher
      const { error } = await supabase
        .from('assistant_messages')
        .insert({
          user_id: teacherProfileId,
          role: 'assistant',
          content: message,
          is_read: false,
        });
      
      if (error) {
        console.error('Error creating internal chat notification:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error sending internal chat notification:', error);
      return false;
    }
  }, []);

  /**
   * Send push notification
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
   * Send notification via specific channel
   */
  const sendViaChannel = useCallback(async (
    channel: NotificationChannel,
    teacher: { 
      profileId: string | null; 
      phone: string | null; 
      email: string | null; 
      telegramId: string | null;
    },
    settings: TeacherNotificationPreferences,
    message: string,
    shortTitle: string,
    shortBody: string
  ): Promise<boolean> => {
    const phone = settings.notification_phone || teacher.phone;
    const telegramId = settings.notification_telegram_id || teacher.telegramId;

    switch (channel) {
      case 'whatsapp':
        if (phone) return sendWhatsAppNotification(phone, message);
        break;
      case 'telegram':
        if (telegramId) return sendTelegramNotification(telegramId, message);
        break;
      case 'max':
        if (phone) return sendMaxNotification(phone, message);
        break;
      case 'internal_chat':
        if (teacher.profileId) return sendInternalChatNotification(teacher.profileId, message);
        break;
      case 'push':
        if (teacher.profileId) return sendPushNotification(teacher.profileId, shortTitle, shortBody);
        break;
      case 'email':
        // TODO: Implement email notifications
        console.log('[Notification] Email not implemented yet');
        break;
    }
    return false;
  }, [sendWhatsAppNotification, sendTelegramNotification, sendMaxNotification, sendInternalChatNotification, sendPushNotification]);

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
      teacherTelegramId: settings.notification_telegram_id || undefined,
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
    const shortTitle = changeType === 'cancelled' ? '❌ Занятие отменено' : '🔔 Изменение в расписании';
    const shortBody = groupName ? `${groupName}: ${changeType === 'cancelled' ? 'отменено' : 'изменено'}` : 'Проверьте расписание';
    
    const channelsSent: string[] = [];
    const teacherData = {
      profileId: teacher.profileId,
      phone: teacher.phone,
      email: teacher.email,
      telegramId: settings.notification_telegram_id,
    };

    // First, try preferred channel
    if (settings.preferred_channel) {
      const isChannelEnabled = (() => {
        switch (settings.preferred_channel) {
          case 'whatsapp': return settings.whatsapp_enabled;
          case 'telegram': return settings.telegram_enabled;
          case 'max': return settings.max_enabled;
          case 'internal_chat': return settings.internal_chat_enabled;
          case 'email': return settings.email_enabled;
          case 'push': return settings.push_enabled;
          default: return false;
        }
      })();

      if (isChannelEnabled) {
        const sent = await sendViaChannel(
          settings.preferred_channel,
          teacherData,
          settings,
          message,
          shortTitle,
          shortBody
        );
        if (sent) {
          channelsSent.push(getChannelDisplayName(settings.preferred_channel));
        }
      }
    }

    // If preferred channel failed or wasn't set, try other enabled channels
    if (channelsSent.length === 0) {
      const channels: NotificationChannel[] = ['internal_chat', 'push', 'whatsapp', 'telegram', 'max'];
      
      for (const channel of channels) {
        if (channel === settings.preferred_channel) continue;
        
        const isEnabled = (() => {
          switch (channel) {
            case 'whatsapp': return settings.whatsapp_enabled;
            case 'telegram': return settings.telegram_enabled;
            case 'max': return settings.max_enabled;
            case 'internal_chat': return settings.internal_chat_enabled;
            case 'push': return settings.push_enabled;
            default: return false;
          }
        })();

        if (isEnabled) {
          const sent = await sendViaChannel(channel, teacherData, settings, message, shortTitle, shortBody);
          if (sent) {
            channelsSent.push(getChannelDisplayName(channel));
            break; // Stop after first successful send
          }
        }
      }
    }

    return { 
      success: true, 
      sent: channelsSent.length > 0,
      channels: channelsSent,
      reason: channelsSent.length === 0 ? 'Не удалось отправить уведомления' : undefined
    };
  }, [getTeacherContact, getTeacherNotificationSettings, formatNotificationMessage, sendViaChannel]);

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