import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Check staff activity against KPI thresholds and create notifications
 * Called hourly by cron job or manually
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date().toISOString().split('T')[0];
    
    console.log(`[check-activity-kpi] Checking activity KPIs for ${today}`);

    // Get all manager KPI settings
    const { data: kpiSettings, error: kpiError } = await supabase
      .from('manager_kpi_settings')
      .select('*');

    if (kpiError) {
      console.error('[check-activity-kpi] Error fetching KPI settings:', kpiError);
      throw kpiError;
    }

    if (!kpiSettings || kpiSettings.length === 0) {
      console.log('[check-activity-kpi] No KPI settings configured');
      return new Response(
        JSON.stringify({ success: true, message: 'No KPI settings', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get today's work sessions for all users with KPI
    const userIds = kpiSettings.map(k => k.profile_id);
    
    const { data: sessions, error: sessionsError } = await supabase
      .from('staff_work_sessions')
      .select('*')
      .eq('session_date', today)
      .in('user_id', userIds);

    if (sessionsError) {
      console.error('[check-activity-kpi] Error fetching sessions:', sessionsError);
      throw sessionsError;
    }

    const sessionMap = new Map(sessions?.map(s => [s.user_id, s]) || []);
    const results: { user_id: string; notifications: string[] }[] = [];

    // Configurable thresholds (can be extended to manager_kpi_settings later)
    const MIN_ACTIVITY_PERCENT = 50; // Minimum activity percentage
    const MAX_IDLE_STREAK_MINUTES = 15; // Maximum idle streak in minutes
    const MIN_ONLINE_HOURS = 4; // Minimum online hours per day

    for (const kpi of kpiSettings) {
      const session = sessionMap.get(kpi.profile_id);
      const userNotifications: string[] = [];

      // Get profile info
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', kpi.profile_id)
        .single();

      const userName = profile 
        ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email 
        : 'Сотрудник';

      if (!session) {
        // User hasn't started work today
        const currentHour = new Date().getHours();
        if (currentHour >= 10) { // After 10 AM
          userNotifications.push('no_session');
          
          // Check for existing notification today
          const { data: existing } = await supabase
            .from('kpi_notifications')
            .select('id')
            .eq('profile_id', kpi.profile_id)
            .eq('notification_type', 'low_activity')
            .gte('created_at', `${today}T00:00:00`)
            .single();

          if (!existing) {
            await supabase.from('kpi_notifications').insert({
              profile_id: kpi.profile_id,
              organization_id: kpi.organization_id,
              notification_type: 'low_activity',
              message: `${userName}: не начал рабочую сессию до ${currentHour}:00`,
              current_value: 0,
              threshold_value: MIN_ONLINE_HOURS,
            });
          }
        }
      } else {
        // Check activity percentage
        const totalSeconds = session.total_online_seconds || 0;
        const activeSeconds = session.active_seconds || 0;
        const activityPercent = totalSeconds > 0 
          ? Math.round((activeSeconds / totalSeconds) * 100) 
          : 0;

        if (totalSeconds > 3600 && activityPercent < MIN_ACTIVITY_PERCENT) { // After 1 hour online
          userNotifications.push('low_activity');
          
          const { data: existing } = await supabase
            .from('kpi_notifications')
            .select('id')
            .eq('profile_id', kpi.profile_id)
            .eq('notification_type', 'low_activity')
            .gte('created_at', `${today}T00:00:00`)
            .single();

          if (!existing) {
            await supabase.from('kpi_notifications').insert({
              profile_id: kpi.profile_id,
              organization_id: kpi.organization_id,
              notification_type: 'low_activity',
              message: `${userName}: низкая активность ${activityPercent}%`,
              current_value: activityPercent,
              threshold_value: MIN_ACTIVITY_PERCENT,
            });
          }
        }

        // Check max idle streak
        const maxIdleMinutes = Math.round((session.max_idle_streak_seconds || 0) / 60);
        if (maxIdleMinutes > MAX_IDLE_STREAK_MINUTES) {
          userNotifications.push('long_idle');
          
          // Only notify once per day for long idle
          const { data: existing } = await supabase
            .from('kpi_notifications')
            .select('id')
            .eq('profile_id', kpi.profile_id)
            .eq('notification_type', 'low_activity')
            .ilike('message', '%простой%')
            .gte('created_at', `${today}T00:00:00`)
            .single();

          if (!existing && maxIdleMinutes > MAX_IDLE_STREAK_MINUTES * 2) { // Only for really long idle
            await supabase.from('kpi_notifications').insert({
              profile_id: kpi.profile_id,
              organization_id: kpi.organization_id,
              notification_type: 'low_activity',
              message: `${userName}: длительный простой ${maxIdleMinutes} мин`,
              current_value: maxIdleMinutes,
              threshold_value: MAX_IDLE_STREAK_MINUTES,
            });
          }
        }

        // Check minimum online hours
        const onlineHours = totalSeconds / 3600;
        const currentHour = new Date().getHours();
        const expectedHours = Math.min(currentHour - 9, MIN_ONLINE_HOURS); // Expected hours since 9 AM
        
        if (currentHour >= 14 && onlineHours < expectedHours * 0.5) { // After 2 PM
          userNotifications.push('low_hours');
        }
      }

      if (userNotifications.length > 0) {
        results.push({ user_id: kpi.profile_id, notifications: userNotifications });
      }
    }

    console.log(`[check-activity-kpi] Processed ${kpiSettings.length} users, ${results.length} with issues`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        date: today,
        processed: kpiSettings.length,
        withIssues: results.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[check-activity-kpi] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
