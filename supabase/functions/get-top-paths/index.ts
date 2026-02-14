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
    const limit = body.limit || 10;
    const days = body.days || 30;

    if (!organizationId) {
      return new Response(JSON.stringify({ error: 'organization_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use RPC if available, otherwise query conversation_paths directly
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_top_conversation_paths', {
        p_organization_id: organizationId,
        p_days: days,
        p_limit: limit,
      });

    if (!rpcError && rpcData) {
      // RPC returns: stage_path, total_conversations, converted, conversion_rate, avg_response_time
      const formatted = rpcData.map((p: any) => ({
        stage_path: p.stage_path,
        count: p.total_conversations,
        conversion_rate: (p.conversion_rate || 0) / 100, // normalize to 0-1
        avg_response_time_sec: p.avg_response_time,
      }));
      return successResponse(formatted);
    }

    // Fallback: direct query with aggregation
    console.log('[get-top-paths] RPC not available, using direct query');

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const { data: paths, error } = await supabase
      .from('conversation_paths')
      .select('stage_path, outcome, avg_response_time_sec')
      .eq('organization_id', organizationId)
      .gte('started_at', sinceDate.toISOString());

    if (error) {
      console.error('[get-top-paths] Error:', error);
      throw new Error(error.message);
    }

    // Aggregate by stage_path
    const pathMap = new Map<string, { count: number; converted: number; totalResponseTime: number }>();

    for (const p of (paths || [])) {
      const key = JSON.stringify(p.stage_path);
      const existing = pathMap.get(key) || { count: 0, converted: 0, totalResponseTime: 0 };
      existing.count++;
      if (p.outcome === 'converted' || p.outcome === 'trial_booked') {
        existing.converted++;
      }
      existing.totalResponseTime += p.avg_response_time_sec || 0;
      pathMap.set(key, existing);
    }

    const aggregated = Array.from(pathMap.entries())
      .map(([key, val]) => ({
        stage_path: JSON.parse(key),
        count: val.count,
        conversion_rate: val.count > 0 ? val.converted / val.count : 0,
        avg_response_time_sec: val.count > 0 ? Math.round(val.totalResponseTime / val.count) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return successResponse(aggregated);
  } catch (error) {
    console.error('[get-top-paths] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
