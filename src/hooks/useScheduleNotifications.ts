import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/typedClient';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export interface ScheduleChangeNotification {
  teacherId: string;
  teacherName: string;
  teacherPhone?: string;
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

export const useScheduleNotifications = () => {
  /**
   * Get teacher contact info by teacher_id or teacher_name
   */
  const getTeacherContact = useCallback(async (
    teacherId?: string | null,
    teacherName?: string | null
  ): Promise<{ id: string; name: string; phone: string | null } | null> => {
    try {
      if (teacherId) {
        const { data } = await supabase
          .from('teachers')
          .select('id, first_name, last_name, phone')
          .eq('id', teacherId)
          .maybeSingle();
        
        if (data) {
          return {
            id: data.id,
            name: `${data.first_name} ${data.last_name || ''}`.trim(),
            phone: data.phone
          };
        }
      }

      if (teacherName) {
        // Try to find by name match
        const nameParts = teacherName.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');

        let query = supabase
          .from('teachers')
          .select('id, first_name, last_name, phone');

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
            phone: data.phone
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
      // Normalize phone number
      const normalizedPhone = phone.replace(/\D/g, '');
      
      // Call WhatsApp send edge function
      const response = await selfHostedPost<{ success: boolean }>('whatsapp-send', {
        phoneNumber: normalizedPhone,
        message,
        // We don't have a clientId for direct teacher notifications
        skipClientLookup: true
      });

      return response.success && response.data?.success === true;
    } catch (error) {
      console.error('Error sending WhatsApp notification:', error);
      return false;
    }
  }, []);

  /**
   * Notify teacher about schedule change
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
  ): Promise<{ success: boolean; sent: boolean; reason?: string }> => {
    const { teacherId, teacherName, sessionId, groupName, changeType, oldValues, newValues, notes } = params;

    // Get teacher contact
    const teacher = await getTeacherContact(teacherId, teacherName);
    
    if (!teacher) {
      return { success: true, sent: false, reason: 'Преподаватель не найден' };
    }

    if (!teacher.phone) {
      return { success: true, sent: false, reason: 'У преподавателя не указан телефон' };
    }

    // Format the notification
    const notification: ScheduleChangeNotification = {
      teacherId: teacher.id,
      teacherName: teacher.name,
      teacherPhone: teacher.phone,
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

    // Send WhatsApp notification
    const sent = await sendWhatsAppNotification(teacher.phone, message);

    return { 
      success: true, 
      sent, 
      reason: sent ? undefined : 'Не удалось отправить WhatsApp сообщение'
    };
  }, [getTeacherContact, formatNotificationMessage, sendWhatsAppNotification]);

  /**
   * Check if notification settings allow sending
   */
  const checkNotificationSettings = useCallback(async (): Promise<boolean> => {
    try {
      // Check if WhatsApp is enabled
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
    formatNotificationMessage,
    checkNotificationSettings
  };
};
