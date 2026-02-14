import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import {
  corsHeaders,
  handleCors,
  successResponse,
  createSelfHostedSupabaseClient,
} from '../_shared/types.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = createSelfHostedSupabaseClient(createClient);
    const body = await req.json().catch(() => ({}));
    const organizationId = body.organization_id;
    const days = body.days || 30;

    if (!organizationId) {
      return new Response(JSON.stringify({ error: 'organization_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try RPC first
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_team_metrics', {
        p_organization_id: organizationId,
        p_days: days,
      });

    if (!rpcError && rpcData?.[0]) {
      const m = rpcData[0];
      return successResponse({
        total_conversations: m.total_conversations || 0,
        avg_conversion_rate: (m.team_conversion_rate || 0) / 100,
        avg_response_time_sec: m.avg_response_time || 0,
        active_managers: m.active_managers || 0,
        total_insights: 0, // will be enriched below
        pending_tips: 0,
      });
    }

    // Fallback: aggregate from conversation_paths + counts
    console.log('[get-team-metrics] RPC not available, using direct queries');

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    // Count conversations
    const { count: totalConversations } = await supabase
      .from('conversation_paths')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('started_at', sinceDate.toISOString());

    // Count converted
    const { count: convertedCount } = await supabase
      .from('conversation_paths')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('started_at', sinceDate.toISOString())
      .in('outcome', ['converted', 'trial_booked']);

    // Active managers (distinct)
    const { data: managerData } = await supabase
      .from('conversation_paths')
      .select('manager_id')
      .eq('organization_id', organizationId)
      .gte('started_at', sinceDate.toISOString());

    const uniqueManagers = new Set((managerData || []).map((d: any) => d.manager_id));

    // Avg response time from latest snapshots
    const { data: snapshots } = await supabase
      .from('manager_performance_snapshots')
      .select('avg_response_time_sec')
      .eq('organization_id', organizationId)
      .gte('snapshot_date', sinceDate.toISOString().split('T')[0]);

    const avgResponseTime = snapshots && snapshots.length > 0
      ? snapshots.reduce((sum: number, s: any) => sum + (s.avg_response_time_sec || 0), 0) / snapshots.length
      : 0;

    // Active insights count
    const { count: insightCount } = await supabase
      .from('team_insights')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'active');

    // Pending tips count
    const { count: tipCount } = await supabase
      .from('manager_coaching_tips')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'pending');

    const total = totalConversations || 0;
    const converted = convertedCount || 0;

    return successResponse({
      total_conversations: total,
      avg_conversion_rate: total > 0 ? converted / total : 0,
      avg_response_time_sec: Math.round(avgResponseTime),
      active_managers: uniqueManagers.size,
      total_insights: insightCount || 0,
      pending_tips: tipCount || 0,
    });
  } catch (error) {
    console.error('[get-team-metrics] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
