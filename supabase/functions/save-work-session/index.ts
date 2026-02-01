import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkSessionUpdate {
  user_id: string;
  organization_id?: string;
  session_date: string; // YYYY-MM-DD
  session_start?: string; // ISO timestamp
  session_end?: string;
  active_seconds_delta?: number;
  idle_seconds_delta?: number;
  on_call_seconds_delta?: number;
  idle_event?: boolean; // Increment idle_events counter
  max_idle_streak?: number; // Update if higher than current
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get auth from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user from JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: WorkSessionUpdate = await req.json();

    // Validate required fields
    if (!body.session_date) {
      return new Response(
        JSON.stringify({ error: 'session_date is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure user can only update their own sessions
    const userId = user.id;

    console.log(`[save-work-session] Updating session for user ${userId}, date ${body.session_date}`);

    // Use service role client for upsert operation
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if session exists for today
    const { data: existing } = await adminClient
      .from('staff_work_sessions')
      .select('id, active_seconds, idle_seconds, on_call_seconds, idle_events, max_idle_streak_seconds, session_start')
      .eq('user_id', userId)
      .eq('session_date', body.session_date)
      .single();

    if (existing) {
      // Update existing session
      const updates: Record<string, unknown> = {};

      if (body.active_seconds_delta) {
        updates.active_seconds = (existing.active_seconds || 0) + body.active_seconds_delta;
        updates.total_online_seconds = (existing.active_seconds || 0) + body.active_seconds_delta + (existing.idle_seconds || 0);
      }
      if (body.idle_seconds_delta) {
        updates.idle_seconds = (existing.idle_seconds || 0) + body.idle_seconds_delta;
        updates.total_online_seconds = (existing.active_seconds || 0) + (existing.idle_seconds || 0) + body.idle_seconds_delta;
      }
      if (body.on_call_seconds_delta) {
        updates.on_call_seconds = (existing.on_call_seconds || 0) + body.on_call_seconds_delta;
      }
      if (body.idle_event) {
        updates.idle_events = (existing.idle_events || 0) + 1;
      }
      if (body.max_idle_streak && body.max_idle_streak > (existing.max_idle_streak_seconds || 0)) {
        updates.max_idle_streak_seconds = body.max_idle_streak;
      }
      if (body.session_end) {
        updates.session_end = body.session_end;
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await adminClient
          .from('staff_work_sessions')
          .update(updates)
          .eq('id', existing.id);

        if (updateError) {
          console.error('[save-work-session] Update error:', updateError);
          throw updateError;
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'updated',
          session_id: existing.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Create new session
      const newSession = {
        user_id: userId,
        organization_id: body.organization_id,
        session_date: body.session_date,
        session_start: body.session_start || new Date().toISOString(),
        active_seconds: body.active_seconds_delta || 0,
        idle_seconds: body.idle_seconds_delta || 0,
        on_call_seconds: body.on_call_seconds_delta || 0,
        total_online_seconds: (body.active_seconds_delta || 0) + (body.idle_seconds_delta || 0),
        idle_events: body.idle_event ? 1 : 0,
        max_idle_streak_seconds: body.max_idle_streak || 0,
      };

      const { data: inserted, error: insertError } = await adminClient
        .from('staff_work_sessions')
        .insert(newSession)
        .select('id')
        .single();

      if (insertError) {
        console.error('[save-work-session] Insert error:', insertError);
        throw insertError;
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'created',
          session_id: inserted?.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('[save-work-session] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
