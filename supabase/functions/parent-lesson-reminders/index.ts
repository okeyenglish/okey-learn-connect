import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { 
  corsHeaders, 
  successResponse, 
  errorResponse,
  getErrorMessage,
  handleCors 
} from '../_shared/types.ts';

interface ParentNotificationSettings {
  student_id: string;
  whatsapp_enabled: boolean;
  telegram_enabled: boolean;
  max_enabled: boolean;
  chatos_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  preferred_channel: string;
  lesson_reminders: boolean;
  reminder_minutes_before: number;
  notification_phone: string | null;
  notification_email: string | null;
  organization_id: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string | null;
  parent_phone: string | null;
  client_id: string | null;
  organization_id: string;
}

interface LessonSession {
  id: string;
  lesson_date: string;
  start_time: string;
  group_id: string;
  status: string;
  parent_reminder_sent?: boolean;
  organization_id: string;
  learning_groups?: { name: string };
}

interface GroupStudent {
  student_id: string;
}

console.log('[parent-lesson-reminders] Function booted');

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

    console.log(`[parent-lesson-reminders] Checking lessons for ${todayDate}, current time: ${currentTime}`);

    // Get default reminder minutes (60) and max window
    const defaultReminderMinutes = 60;
    const maxReminderMinutes = 120; // Check up to 2 hours ahead

    const maxTime = new Date(now.getTime() + (maxReminderMinutes + 5) * 60 * 1000);
    const maxTimeStr = maxTime.toTimeString().slice(0, 5);

    console.log(`[parent-lesson-reminders] Searching lessons between ${currentTime} and ${maxTimeStr}`);

    // Find lessons starting within our time window
    const { data: upcomingLessons, error: lessonsError } = await supabase
      .from('lesson_sessions')
      .select(`
        id,
        lesson_date,
        start_time,
        group_id,
        status,
        parent_reminder_sent,
        organization_id,
        learning_groups!inner(name)
      `)
      .eq('lesson_date', todayDate)
      .eq('status', 'scheduled')
      .gte('start_time', currentTime)
      .lte('start_time', maxTimeStr)
      .or('parent_reminder_sent.is.null,parent_reminder_sent.eq.false')
      .limit(100);

    if (lessonsError) {
      console.error('[parent-lesson-reminders] Error fetching lessons:', lessonsError);
      throw lessonsError;
    }

    console.log(`[parent-lesson-reminders] Found ${upcomingLessons?.length || 0} potential lessons`);

    if (!upcomingLessons || upcomingLessons.length === 0) {
      return successResponse({ success: true, message: 'No lessons to notify parents', count: 0 });
    }

    // Get all group IDs
    const groupIds = [...new Set(upcomingLessons.map(l => l.group_id))];

    // Get students in these groups
    const { data: groupStudents, error: gsError } = await supabase
      .from('group_students')
      .select('student_id, group_id')
      .in('group_id', groupIds);

    if (gsError) {
      console.error('[parent-lesson-reminders] Error fetching group students:', gsError);
    }

    // Get unique student IDs
    const studentIds = [...new Set((groupStudents || []).map(gs => gs.student_id))];

    if (studentIds.length === 0) {
      return successResponse({ success: true, message: 'No students in groups', count: 0 });
    }

    // Get student details
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, first_name, last_name, parent_phone, client_id, organization_id')
      .in('id', studentIds);

    if (studentsError) {
      console.error('[parent-lesson-reminders] Error fetching students:', studentsError);
    }

    const studentMap = new Map<string, Student>();
    for (const s of (students || []) as Student[]) {
      studentMap.set(s.id, s);
    }

    // Get parent notification settings
    const { data: parentSettings, error: settingsError } = await supabase
      .from('parent_notification_settings')
      .select('*')
      .in('student_id', studentIds)
      .eq('lesson_reminders', true);

    if (settingsError) {
      console.error('[parent-lesson-reminders] Error fetching parent settings:', settingsError);
    }

    const settingsMap = new Map<string, ParentNotificationSettings>();
    for (const setting of (parentSettings || []) as ParentNotificationSettings[]) {
      settingsMap.set(setting.student_id, setting);
    }

    // Create group -> students mapping
    const groupStudentsMap = new Map<string, string[]>();
    for (const gs of (groupStudents || []) as Array<{ student_id: string; group_id: string }>) {
      if (!groupStudentsMap.has(gs.group_id)) {
        groupStudentsMap.set(gs.group_id, []);
      }
      groupStudentsMap.get(gs.group_id)!.push(gs.student_id);
    }

    const notificationResults: Array<{
      lessonId: string;
      studentName: string;
      parentPhone?: string;
      minutesUntilLesson: number;
      notificationsSent: number;
      success: boolean;
      error?: string;
    }> = [];

    for (const lesson of upcomingLessons as LessonSession[]) {
      const lessonStudentIds = groupStudentsMap.get(lesson.group_id) || [];
      const groupName = lesson.learning_groups?.name || 'Группа';

      // Calculate minutes until lesson
      const [hours, mins] = lesson.start_time.split(':').map(Number);
      const lessonStart = new Date(now);
      lessonStart.setHours(hours, mins, 0, 0);
      const minutesUntilLesson = (lessonStart.getTime() - now.getTime()) / (60 * 1000);

      let lessonNotificationsSent = 0;

      for (const studentId of lessonStudentIds) {
        const student = studentMap.get(studentId);
        if (!student) continue;

        // Get settings or use defaults
        const settings = settingsMap.get(studentId) || {
          student_id: studentId,
          whatsapp_enabled: true,
          telegram_enabled: false,
          max_enabled: false,
          chatos_enabled: true,
          email_enabled: false,
          push_enabled: true,
          preferred_channel: 'whatsapp',
          lesson_reminders: true,
          reminder_minutes_before: defaultReminderMinutes,
          notification_phone: null,
          notification_email: null,
          organization_id: student.organization_id,
        };

        // Check if we should notify now based on reminder_minutes_before
        const targetMinutes = settings.reminder_minutes_before;
        if (minutesUntilLesson > targetMinutes + 5 || minutesUntilLesson < targetMinutes - 5) {
          continue;
        }

        const studentName = `${student.first_name} ${student.last_name || ''}`.trim();
        const parentPhone = settings.notification_phone || student.parent_phone;

        if (!parentPhone) {
          console.log(`[parent-lesson-reminders] No parent phone for student ${studentId}`);
          continue;
        }

        let notificationsSent = 0;

        // Prepare message
        const message = `👋 Напоминание!\n\n🎓 ${studentName} — занятие "${groupName}"\n📅 Сегодня в ${lesson.start_time}\n⏰ До начала ~${Math.round(minutesUntilLesson)} минут`;

        // Log notification to history
        const logNotification = async (channel: string, status: string, externalId?: string, errorDetails?: string) => {
          try {
            await supabase.from('notification_history').insert({
              organization_id: lesson.organization_id,
              recipient_type: 'parent',
              recipient_id: student.client_id,
              recipient_name: `Родитель ${studentName}`,
              recipient_contact: parentPhone,
              channel,
              notification_type: 'lesson_reminder',
              lesson_session_id: lesson.id,
              group_id: lesson.group_id,
              student_id: studentId,
              title: `Напоминание о занятии`,
              message_text: message,
              status,
              status_details: errorDetails,
              external_message_id: externalId,
              sent_at: status === 'sent' || status === 'delivered' ? new Date().toISOString() : null,
              failed_at: status === 'failed' ? new Date().toISOString() : null,
            });
          } catch (logError) {
            console.error('[parent-lesson-reminders] Failed to log notification:', logError);
          }
        };

        // Send via preferred channel first, then fallback
        const channels = [settings.preferred_channel];
        if (settings.whatsapp_enabled && !channels.includes('whatsapp')) channels.push('whatsapp');
        if (settings.telegram_enabled && !channels.includes('telegram')) channels.push('telegram');
        if (settings.chatos_enabled && !channels.includes('chatos')) channels.push('chatos');

        for (const channel of channels) {
          if (notificationsSent > 0) break; // Already sent via one channel

          try {
            if (channel === 'whatsapp' && settings.whatsapp_enabled) {
              const { data: whatsappResult, error: whatsappError } = await supabase.functions.invoke('whatsapp-send', {
                body: {
                  phoneNumber: parentPhone.replace(/\D/g, ''),
                  message,
                  skipClientLookup: true,
                },
              });

              if (!whatsappError && whatsappResult?.success) {
                notificationsSent++;
                await logNotification('whatsapp', 'sent', whatsappResult?.messageId);
                console.log(`[parent-lesson-reminders] WhatsApp sent for student ${studentId}`);
              } else {
                await logNotification('whatsapp', 'failed', undefined, whatsappError?.message || 'Unknown error');
              }
            } else if (channel === 'telegram' && settings.telegram_enabled) {
              // Telegram would need chat_id, skip for now if not available
              await logNotification('telegram', 'failed', undefined, 'Telegram chat not configured');
            } else if (channel === 'chatos' && settings.chatos_enabled && student.client_id) {
              // Send via ChatOS (internal chat)
              const { error: chatosError } = await supabase
                .from('chat_messages')
                .insert({
                  client_id: student.client_id,
                  content: message,
                  messenger: 'chatos',
                  message_type: 'text',
                  direction: 'outgoing',
                  sender_name: 'Система',
                  is_read: false,
                  status: 'sent',
                  organization_id: lesson.organization_id,
                });

              if (!chatosError) {
                notificationsSent++;
                await logNotification('chatos', 'sent');
                console.log(`[parent-lesson-reminders] ChatOS sent for student ${studentId}`);
              } else {
                await logNotification('chatos', 'failed', undefined, chatosError.message);
              }
            }
          } catch (err) {
            console.error(`[parent-lesson-reminders] Error sending via ${channel}:`, err);
            await logNotification(channel, 'failed', undefined, String(err));
          }
        }

        lessonNotificationsSent += notificationsSent;

        notificationResults.push({
          lessonId: lesson.id,
          studentName,
          parentPhone,
          minutesUntilLesson: Math.round(minutesUntilLesson),
          notificationsSent,
          success: notificationsSent > 0,
        });
      }

      // Mark lesson as parent notified if at least one notification was sent
      if (lessonNotificationsSent > 0) {
        const { error: updateError } = await supabase
          .from('lesson_sessions')
          .update({ parent_reminder_sent: true })
          .eq('id', lesson.id);

        if (updateError) {
          console.error(`[parent-lesson-reminders] Failed to update parent_reminder_sent:`, updateError);
        }
      }
    }

    const successCount = notificationResults.filter(r => r.success).length;

    return successResponse({
      success: true,
      message: `Sent parent reminders for ${successCount} of ${notificationResults.length} students`,
      results: notificationResults,
    });

  } catch (error: unknown) {
    console.error('[parent-lesson-reminders] Error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});
