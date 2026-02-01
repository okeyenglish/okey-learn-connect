import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Aggregate staff work sessions into daily stats
 * Called by cron job hourly or manually for a specific date
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get date from body or use today
    let targetDate: string;
    try {
      const body = await req.json();
      targetDate = body.date || new Date().toISOString().split('T')[0];
    } catch {
      targetDate = new Date().toISOString().split('T')[0];
    }

    console.log(`[aggregate-staff-stats] Aggregating stats for ${targetDate}`);

    // Get all work sessions for the target date
    const { data: sessions, error: sessionsError } = await supabase
      .from('staff_work_sessions')
      .select('*')
      .eq('session_date', targetDate);

    if (sessionsError) {
      console.error('[aggregate-staff-stats] Error fetching sessions:', sessionsError);
      throw sessionsError;
    }

    if (!sessions || sessions.length === 0) {
      console.log('[aggregate-staff-stats] No sessions to aggregate');
      return new Response(
        JSON.stringify({ success: true, message: 'No sessions to aggregate', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[aggregate-staff-stats] Found ${sessions.length} sessions to aggregate`);

    const results: { user_id: string; status: string }[] = [];

    for (const session of sessions) {
      try {
        // Calculate efficiency score (active time / total online time * 100)
        const totalOnline = session.total_online_seconds || 0;
        const activeSeconds = session.active_seconds || 0;
        const idleSeconds = session.idle_seconds || 0;
        const onCallSeconds = session.on_call_seconds || 0;

        // Efficiency: active + call time vs total time (excluding idle)
        // Higher is better - meaning more productive time
        const productiveSeconds = activeSeconds + onCallSeconds;
        const efficiencyScore = totalOnline > 0 
          ? Math.round((productiveSeconds / totalOnline) * 100 * 100) / 100 
          : 0;

        const statsRecord = {
          user_id: session.user_id,
          organization_id: session.organization_id,
          stat_date: targetDate,
          total_online_minutes: Math.round(totalOnline / 60),
          active_minutes: Math.round(activeSeconds / 60),
          idle_minutes: Math.round(idleSeconds / 60),
          call_minutes: Math.round(onCallSeconds / 60),
          efficiency_score: efficiencyScore,
        };

        // Upsert into daily stats
        const { error: upsertError } = await supabase
          .from('staff_daily_stats')
          .upsert(statsRecord, {
            onConflict: 'user_id,stat_date',
          });

        if (upsertError) {
          console.error(`[aggregate-staff-stats] Error upserting stats for ${session.user_id}:`, upsertError);
          results.push({ user_id: session.user_id, status: 'error' });
        } else {
          results.push({ user_id: session.user_id, status: 'success' });
        }
      } catch (err) {
        console.error(`[aggregate-staff-stats] Error processing session ${session.id}:`, err);
        results.push({ user_id: session.user_id, status: 'error' });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    console.log(`[aggregate-staff-stats] Completed: ${successCount}/${results.length} successful`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        date: targetDate,
        processed: results.length,
        successful: successCount,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[aggregate-staff-stats] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
