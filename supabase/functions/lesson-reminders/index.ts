import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { 
  corsHeaders, 
  successResponse, 
  errorResponse,
  getErrorMessage,
  handleCors 
} from '../_shared/types.ts';

interface TeacherNotificationSettings {
  teacher_id: string;
  whatsapp_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  lesson_reminders: boolean;
  reminder_minutes_before: number;
  notification_phone: string | null;
  notification_email: string | null;
}

interface LessonSession {
  id: string;
  lesson_date: string;
  start_time: string;
  teacher_id: string | null;
  teacher_name: string;
  group_id: string;
  status: string;
  reminder_sent?: boolean;
  learning_groups?: { name: string };
}

interface Teacher {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  profile_id: string | null;
}

console.log('[lesson-reminders] Function booted');

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const todayDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);

    console.log(`[lesson-reminders] Checking lessons for ${todayDate}, current time: ${currentTime}`);

    // Get all teachers with notification settings
    const { data: teacherSettings, error: settingsError } = await supabase
      .from('teacher_notification_settings')
      .select('*')
      .eq('lesson_reminders', true);

    if (settingsError) {
      console.error('[lesson-reminders] Error fetching settings:', settingsError);
    }

    // Create a map of teacher_id -> settings (with defaults)
    const settingsMap = new Map<string, TeacherNotificationSettings>();
    const defaultReminderMinutes = 60;
    
    if (teacherSettings) {
      for (const setting of teacherSettings as TeacherNotificationSettings[]) {
        settingsMap.set(setting.teacher_id, setting);
      }
    }

    // Get all teachers to build a complete picture
    const { data: allTeachers, error: teachersError } = await supabase
      .from('teachers')
      .select('id, first_name, last_name, phone, email, profile_id')
      .eq('is_active', true);

    if (teachersError) {
      console.error('[lesson-reminders] Error fetching teachers:', teachersError);
      throw teachersError;
    }

    // Build teacher lookup map
    const teacherMap = new Map<string, Teacher>();
    for (const teacher of (allTeachers || []) as Teacher[]) {
      teacherMap.set(teacher.id, teacher);
    }

    // Find unique reminder windows needed
    const reminderWindows = new Set<number>();
    reminderWindows.add(defaultReminderMinutes); // Default
    
    for (const settings of settingsMap.values()) {
      reminderWindows.add(settings.reminder_minutes_before);
    }

    // Calculate time ranges for each window
    const timeRanges: { min: number; maxTime: string }[] = [];
    for (const minutes of reminderWindows) {
      const targetTime = new Date(now.getTime() + minutes * 60 * 1000);
      // Add a 5-minute tolerance window
      const maxTime = new Date(targetTime.getTime() + 5 * 60 * 1000);
      timeRanges.push({
        min: minutes,
        maxTime: maxTime.toTimeString().slice(0, 5),
      });
    }

    // Find the maximum time window
    const maxTargetTime = Math.max(...Array.from(reminderWindows));
    const maxTime = new Date(now.getTime() + (maxTargetTime + 5) * 60 * 1000);
    const maxTimeStr = maxTime.toTimeString().slice(0, 5);

    console.log(`[lesson-reminders] Searching lessons between ${currentTime} and ${maxTimeStr}`);

    // Find lessons starting within our time windows
    const { data: upcomingLessons, error: lessonsError } = await supabase
      .from('lesson_sessions')
      .select(`
        id,
        lesson_date,
        start_time,
        teacher_id,
        teacher_name,
        group_id,
        status,
        reminder_sent,
        learning_groups!inner(name)
      `)
      .eq('lesson_date', todayDate)
      .eq('status', 'scheduled')
      .gte('start_time', currentTime)
      .lte('start_time', maxTimeStr)
      .or('reminder_sent.is.null,reminder_sent.eq.false')
      .limit(100);

    if (lessonsError) {
      console.error('[lesson-reminders] Error fetching lessons:', lessonsError);
      throw lessonsError;
    }

    console.log(`[lesson-reminders] Found ${upcomingLessons?.length || 0} potential lessons`);

    if (!upcomingLessons || upcomingLessons.length === 0) {
      return successResponse({ success: true, message: 'No lessons to notify', count: 0 });
    }

    const notificationResults = [];

    for (const lesson of upcomingLessons as LessonSession[]) {
      try {
        // Determine teacher
        let teacher: Teacher | null = null;
        
        if (lesson.teacher_id) {
          teacher = teacherMap.get(lesson.teacher_id) || null;
        }
        
        // If no teacher_id, try to find by name
        if (!teacher && lesson.teacher_name) {
          const nameParts = lesson.teacher_name.split(' ');
          for (const t of teacherMap.values()) {
            const fullName = `${t.first_name} ${t.last_name || ''}`.trim();
            if (fullName === lesson.teacher_name || 
                (nameParts.length >= 1 && t.first_name === nameParts[0])) {
              teacher = t;
              break;
            }
          }
        }

        if (!teacher) {
          console.log(`[lesson-reminders] Teacher not found for lesson ${lesson.id}`);
          continue;
        }

        // Get settings for this teacher (use defaults if not configured)
        const settings = settingsMap.get(teacher.id) || {
          teacher_id: teacher.id,
          whatsapp_enabled: true,
          email_enabled: false,
          push_enabled: true,
          lesson_reminders: true,
          reminder_minutes_before: defaultReminderMinutes,
          notification_phone: null,
          notification_email: null,
        };

        // Check if we should notify now based on reminder_minutes_before
        const [hours, mins] = lesson.start_time.split(':').map(Number);
        const lessonStart = new Date(now);
        lessonStart.setHours(hours, mins, 0, 0);
        
        const minutesUntilLesson = (lessonStart.getTime() - now.getTime()) / (60 * 1000);
        const targetMinutes = settings.reminder_minutes_before;
        
        // Only notify if we're within 5 minutes of the target reminder time
        if (minutesUntilLesson > targetMinutes + 5 || minutesUntilLesson < targetMinutes - 5) {
          console.log(`[lesson-reminders] Lesson ${lesson.id} not in window: ${minutesUntilLesson.toFixed(0)} min until start, target: ${targetMinutes} min`);
          continue;
        }

        const groupName = lesson.learning_groups?.name || 'Группа';
        const reminderText = `${groupName} в ${lesson.start_time}`;
        const fullMessage = `⏰ Напоминание: ${groupName}\n📅 Сегодня в ${lesson.start_time}\n\nДо начала занятия ~${Math.round(minutesUntilLesson)} минут`;
        
        let notificationsSent = 0;

        // Helper to log notification to history
        const logNotification = async (channel: string, status: string, externalId?: string, errorDetails?: string) => {
          try {
            // Get organization_id from lesson_sessions
            const { data: lessonData } = await supabase
              .from('lesson_sessions')
              .select('organization_id')
              .eq('id', lesson.id)
              .single();

            if (lessonData?.organization_id) {
              await supabase.from('notification_history').insert({
                organization_id: lessonData.organization_id,
                recipient_type: 'teacher',
                recipient_id: teacher.id,
                recipient_name: `${teacher.first_name} ${teacher.last_name || ''}`.trim(),
                recipient_contact: settings.notification_phone || teacher.phone,
                channel,
                notification_type: 'lesson_reminder',
                lesson_session_id: lesson.id,
                group_id: lesson.group_id,
                title: `Напоминание о занятии`,
                message_text: fullMessage,
                status,
                status_details: errorDetails,
                external_message_id: externalId,
                sent_at: status === 'sent' || status === 'delivered' ? new Date().toISOString() : null,
                failed_at: status === 'failed' ? new Date().toISOString() : null,
              });
            }
          } catch (logError) {
            console.error('[lesson-reminders] Failed to log notification:', logError);
          }
        };

        // Send Push notification
        if (settings.push_enabled && teacher.profile_id) {
          try {
            const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
              body: {
                userId: teacher.profile_id,
                payload: {
                  title: `⏰ Занятие через ${Math.round(minutesUntilLesson)} мин`,
                  body: reminderText,
                  icon: '/pwa-192x192.png',
                  url: '/teacher-portal?tab=schedule',
                  tag: `lesson-${lesson.id}-${Date.now()}`,
                },
              },
            });

            if (!pushError) {
              notificationsSent++;
              await logNotification('push', 'sent');
              console.log(`[lesson-reminders] Push sent for lesson ${lesson.id}`);
            } else {
              await logNotification('push', 'failed', undefined, pushError.message);
              console.error(`[lesson-reminders] Push error:`, pushError);
            }
          } catch (err) {
            await logNotification('push', 'failed', undefined, String(err));
            console.error(`[lesson-reminders] Push exception:`, err);
          }
        }

        // Send WhatsApp notification
        if (settings.whatsapp_enabled) {
          const phone = settings.notification_phone || teacher.phone;
          if (phone) {
            try {
              const { data: whatsappResult, error: whatsappError } = await supabase.functions.invoke('whatsapp-send', {
                body: {
                  phoneNumber: phone.replace(/\D/g, ''),
                  message: fullMessage,
                  skipClientLookup: true,
                },
              });

              if (!whatsappError) {
                notificationsSent++;
                await logNotification('whatsapp', 'sent', whatsappResult?.messageId);
                console.log(`[lesson-reminders] WhatsApp sent for lesson ${lesson.id}`);
              } else {
                await logNotification('whatsapp', 'failed', undefined, whatsappError.message);
                console.error(`[lesson-reminders] WhatsApp error:`, whatsappError);
              }
            } catch (err) {
              await logNotification('whatsapp', 'failed', undefined, String(err));
              console.error(`[lesson-reminders] WhatsApp exception:`, err);
            }
          }
        }

        // Mark lesson as notified
        if (notificationsSent > 0) {
          const { error: updateError } = await supabase
            .from('lesson_sessions')
            .update({ reminder_sent: true })
            .eq('id', lesson.id);

          if (updateError) {
            console.error(`[lesson-reminders] Failed to update reminder_sent:`, updateError);
          }
        }

        notificationResults.push({
          lessonId: lesson.id,
          teacherName: lesson.teacher_name,
          minutesUntilLesson: Math.round(minutesUntilLesson),
          notificationsSent,
          success: notificationsSent > 0,
        });

      } catch (err) {
        console.error(`[lesson-reminders] Error processing lesson ${lesson.id}:`, err);
        notificationResults.push({
          lessonId: lesson.id,
          success: false,
          error: String(err),
        });
      }
    }

    const successCount = notificationResults.filter(r => r.success).length;

    return successResponse({
      success: true,
      message: `Sent reminders for ${successCount} of ${notificationResults.length} lessons`,
      results: notificationResults,
    });

  } catch (error: unknown) {
    console.error('[lesson-reminders] Error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});