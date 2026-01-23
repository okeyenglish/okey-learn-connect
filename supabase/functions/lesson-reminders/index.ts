import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LessonSession {
  id: string;
  lesson_date: string;
  start_time: string;
  teacher_id: string;
  group_id: string;
  group_name?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
    const { data: upcomingLessons, error: lessonsError } = await supabase
      .from('group_sessions')
      .select(`
        id,
        lesson_date,
        start_time,
        teacher_id,
        group_id,
        reminder_sent,
        groups!inner(name)
      `)
      .eq('lesson_date', todayDate)
      .gte('start_time', currentTime)
      .lte('start_time', targetTime)
      .neq('reminder_sent', true)
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

    for (const lesson of upcomingLessons) {
      try {
        const groupName = (lesson.groups as any)?.name || 'Группа';
        
        // Get teacher's user_id from teachers table
        const { data: teacher, error: teacherError } = await supabase
          .from('teachers')
          .select('user_id, first_name')
          .eq('id', lesson.teacher_id)
          .single();

        if (teacherError || !teacher?.user_id) {
          console.log(`[lesson-reminders] No user_id for teacher ${lesson.teacher_id}`);
          continue;
        }

        // Send push notification
        const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
          body: {
            userId: teacher.user_id,
            payload: {
              title: '⏰ Занятие через 15 минут',
              body: `${groupName} в ${lesson.start_time}`,
              icon: '/pwa-192x192.png',
              url: '/teacher-portal?tab=schedule',
              tag: `lesson-${lesson.id}`,
            },
          },
        });

        if (pushError) {
          console.error(`[lesson-reminders] Push error for lesson ${lesson.id}:`, pushError);
        } else {
          console.log(`[lesson-reminders] Sent reminder for lesson ${lesson.id} to teacher ${teacher.first_name}`);
        }

        // Mark lesson as notified
        await supabase
          .from('group_sessions')
          .update({ reminder_sent: true })
          .eq('id', lesson.id);

        notificationResults.push({
          lessonId: lesson.id,
          teacherId: lesson.teacher_id,
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

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${successCount} of ${upcomingLessons.length} reminders`,
        results: notificationResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[lesson-reminders] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
