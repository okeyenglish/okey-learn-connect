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
      .rpc('get_manager_comparison', {
        p_organization_id: organizationId,
        p_days: days,
      });

    if (!rpcError && rpcData) {
      const formatted = rpcData.map((m: any) => ({
        manager_id: m.manager_id,
        manager_name: m.manager_name,
        total_conversations: m.total_conversations,
        conversion_rate: (m.conversion_rate || 0) / 100,
        avg_response_time_sec: m.avg_response_time || 0,
        avg_messages_per_conversation: m.avg_messages_per_conversation || 0,
        most_common_path: m.most_used_path,
      }));
      return successResponse(formatted);
    }

    // Fallback: query latest performance snapshots
    console.log('[get-manager-comparison] RPC not available, using snapshots');

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const { data: snapshots, error } = await supabase
      .from('manager_performance_snapshots')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('snapshot_date', sinceDate.toISOString().split('T')[0])
      .order('snapshot_date', { ascending: false });

    if (error) {
      console.error('[get-manager-comparison] Error:', error);
      throw new Error(error.message);
    }

    // Aggregate by manager_id
    const managerMap = new Map<string, any>();

    for (const s of (snapshots || [])) {
      if (!managerMap.has(s.manager_id)) {
        managerMap.set(s.manager_id, {
          manager_id: s.manager_id,
          total_conversations: 0,
          total_converted: 0,
          total_response_time: 0,
          total_messages: 0,
          snapshot_count: 0,
          most_common_path: s.most_common_path,
        });
      }
      const m = managerMap.get(s.manager_id);
      m.total_conversations += s.total_conversations || 0;
      m.total_converted += s.conversations_converted || 0;
      m.total_response_time += (s.avg_response_time_sec || 0) * (s.total_conversations || 1);
      m.total_messages += (s.avg_messages_per_conversation || 0) * (s.total_conversations || 1);
      m.snapshot_count++;
    }

    // Get manager names
    const managerIds = [...managerMap.keys()];
    let nameMap: Record<string, string> = {};
    if (managerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', managerIds);

      if (profiles) {
        for (const p of profiles) {
          nameMap[p.id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.id.slice(0, 8);
        }
      }
    }

    const result = Array.from(managerMap.values()).map((m: any) => ({
      manager_id: m.manager_id,
      manager_name: nameMap[m.manager_id] || m.manager_id.slice(0, 8),
      total_conversations: m.total_conversations,
      conversion_rate: m.total_conversations > 0 ? m.total_converted / m.total_conversations : 0,
      avg_response_time_sec: m.total_conversations > 0
        ? Math.round(m.total_response_time / m.total_conversations)
        : 0,
      avg_messages_per_conversation: m.total_conversations > 0
        ? Math.round((m.total_messages / m.total_conversations) * 10) / 10
        : 0,
      most_common_path: m.most_common_path,
    }));

    return successResponse(result);
  } catch (error) {
    console.error('[get-manager-comparison] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
