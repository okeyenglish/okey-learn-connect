import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { 
  corsHeaders, 
  successResponse, 
  errorResponse,
  getErrorMessage,
  handleCors 
} from '../_shared/types.ts';

interface LessonSession {
  id: string;
  lesson_date: string;
  start_time: string;
  teacher_name: string;
  group_id: string;
  status: string;
  reminder_sent?: boolean;
  learning_groups?: { name: string };
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

    // Get current time and time 15 minutes from now
    const now = new Date();
    const in15Minutes = new Date(now.getTime() + 15 * 60 * 1000);
    
    const todayDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);
    const targetTime = in15Minutes.toTimeString().slice(0, 5);

    console.log(`[lesson-reminders] Checking lessons between ${currentTime} and ${targetTime} on ${todayDate}`);

    // Find lessons starting in ~15 minutes that haven't been notified
    // Using lesson_sessions table (not group_sessions)
    const { data: upcomingLessons, error: lessonsError } = await supabase
      .from('lesson_sessions')
      .select(`
        id,
        lesson_date,
        start_time,
        teacher_name,
        group_id,
        status,
        reminder_sent,
        learning_groups!inner(name)
      `)
      .eq('lesson_date', todayDate)
      .eq('status', 'scheduled')
      .gte('start_time', currentTime)
      .lte('start_time', targetTime)
      .or('reminder_sent.is.null,reminder_sent.eq.false')
      .limit(50);

    if (lessonsError) {
      console.error('[lesson-reminders] Error fetching lessons:', lessonsError);
      throw lessonsError;
    }

    console.log(`[lesson-reminders] Found ${upcomingLessons?.length || 0} lessons to notify`);

    if (!upcomingLessons || upcomingLessons.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No lessons to notify', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const notificationResults = [];

    for (const lesson of upcomingLessons as LessonSession[]) {
      try {
        const groupName = lesson.learning_groups?.name || 'Группа';
        
        // Find teacher by name (teacher_name contains full name like "Иван Петров")
        const teacherNameParts = lesson.teacher_name?.split(' ') || [];
        
        let teacherQuery = supabase
          .from('teachers')
          .select('user_id, first_name, last_name');
        
        // Try to match by first_name or last_name
        if (teacherNameParts.length >= 2) {
          teacherQuery = teacherQuery.or(
            `first_name.ilike.%${teacherNameParts[0]}%,last_name.ilike.%${teacherNameParts[1]}%`
          );
        } else if (teacherNameParts.length === 1) {
          teacherQuery = teacherQuery.or(
            `first_name.ilike.%${teacherNameParts[0]}%,last_name.ilike.%${teacherNameParts[0]}%`
          );
        }

        const { data: teachers, error: teacherError } = await teacherQuery.limit(1);

        if (teacherError || !teachers || teachers.length === 0 || !teachers[0]?.user_id) {
          console.log(`[lesson-reminders] No user_id found for teacher "${lesson.teacher_name}"`);
          continue;
        }

        const teacher = teachers[0];

        // Send push notification
        const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
          body: {
            userId: teacher.user_id,
            payload: {
              title: '⏰ Занятие через 15 минут',
              body: `${groupName} в ${lesson.start_time}`,
              icon: '/pwa-192x192.png',
              url: '/teacher-portal?tab=schedule',
              tag: `lesson-${lesson.id}-${Date.now()}`,
            },
          },
        });

        if (pushError) {
          console.error(`[lesson-reminders] Push error for lesson ${lesson.id}:`, pushError);
        } else {
          console.log(`[lesson-reminders] Sent reminder for lesson ${lesson.id} to teacher ${teacher.first_name}`);
        }

        // Mark lesson as notified
        const { error: updateError } = await supabase
          .from('lesson_sessions')
          .update({ reminder_sent: true })
          .eq('id', lesson.id);

        if (updateError) {
          console.error(`[lesson-reminders] Failed to update reminder_sent for ${lesson.id}:`, updateError);
        }

        notificationResults.push({
          lessonId: lesson.id,
          teacherName: lesson.teacher_name,
          success: !pushError,
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
      message: `Sent ${successCount} of ${upcomingLessons.length} reminders`,
      results: notificationResults,
    });

  } catch (error: unknown) {
    console.error('[lesson-reminders] Error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});
