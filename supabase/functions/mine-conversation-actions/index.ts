import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { corsHeaders } from '../_shared/types.ts';

/**
 * Mine Conversation Actions (Daily Cron)
 * 
 * Analyzes successful conversations to discover which actions
 * after which stages led to conversions. Updates NBA success rates.
 * 
 * Pipeline:
 * 1. Get conversations that converted (client status → student) in last 24h
 * 2. Get their stage transition history
 * 3. Analyze what manager actions followed each stage
 * 4. Update success_rate in next_best_actions
 * 5. Optionally create new mined NBAs
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const selfHostedUrl = Deno.env.get('SELF_HOSTED_URL') || Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(selfHostedUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const daysBack = body.days_back || 7;
    const orgId = body.organization_id;

    console.log(`[mine-actions] Starting mining for last ${daysBack} days`);

    // 1. Get organizations to process
    let orgIds: string[] = [];
    if (orgId) {
      orgIds = [orgId];
    } else {
      const { data: orgs } = await supabase
        .from('conversation_stage_transitions')
        .select('organization_id')
        .gte('created_at', new Date(Date.now() - daysBack * 86400000).toISOString());
      orgIds = [...new Set((orgs || []).map(o => o.organization_id))];
    }

    if (orgIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No organizations with transitions to mine' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalMined = 0;

    for (const currentOrgId of orgIds) {
      try {
        // 2. Get successful conversions (clients who became students recently)
        const { data: recentStudents } = await supabase
          .from('students')
          .select('client_id')
          .eq('organization_id', currentOrgId)
          .gte('created_at', new Date(Date.now() - daysBack * 86400000).toISOString())
          .not('client_id', 'is', null);

        const convertedClientIds = (recentStudents || []).map(s => s.client_id).filter(Boolean);

        if (convertedClientIds.length === 0) continue;

        // 3. Get stage transitions for converted clients
        const { data: transitions } = await supabase
          .from('conversation_stage_transitions')
          .select('client_id, from_stage, to_stage, created_at')
          .eq('organization_id', currentOrgId)
          .in('client_id', convertedClientIds)
          .order('created_at');

        if (!transitions || transitions.length === 0) continue;

        // 4. Analyze patterns: which stage sequences appear in successful paths
        const stagePaths: Record<string, { count: number; transitions: string[] }> = {};

        // Group transitions by client
        const byClient: Record<string, typeof transitions> = {};
        for (const t of transitions) {
          if (!byClient[t.client_id]) byClient[t.client_id] = [];
          byClient[t.client_id].push(t);
        }

        // Extract stage paths
        for (const [cid, clientTransitions] of Object.entries(byClient)) {
          const path = clientTransitions.map(t => t.to_stage).join(' → ');
          
          // Record each transition as a successful action
          for (const t of clientTransitions) {
            const key = `${t.from_stage}→${t.to_stage}`;
            if (!stagePaths[key]) {
              stagePaths[key] = { count: 0, transitions: [] };
            }
            stagePaths[key].count++;
            if (!stagePaths[key].transitions.includes(path)) {
              stagePaths[key].transitions.push(path);
            }
          }

          // Record action outcomes
          for (const t of clientTransitions) {
            await supabase
              .from('conversation_action_outcomes')
              .insert({
                organization_id: currentOrgId,
                client_id: cid,
                stage_code: t.from_stage || 'unknown',
                action_taken: `transition_to_${t.to_stage}`,
                next_stage: t.to_stage,
                led_to_conversion: true,
              });
          }
        }

        // 5. Update success rates in existing NBAs
        const { data: existingNbas } = await supabase
          .from('next_best_actions')
          .select('id, stage_code, action_type, usage_count')
          .eq('organization_id', currentOrgId);

        for (const nba of (existingNbas || [])) {
          // Count how many successful outcomes match this stage
          const { count } = await supabase
            .from('conversation_action_outcomes')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', currentOrgId)
            .eq('stage_code', nba.stage_code)
            .eq('led_to_conversion', true);

          const totalOutcomes = count || 0;
          if (totalOutcomes > 0) {
            const { count: totalForStage } = await supabase
              .from('conversation_action_outcomes')
              .select('id', { count: 'exact', head: true })
              .eq('organization_id', currentOrgId)
              .eq('stage_code', nba.stage_code);

            const successRate = totalForStage ? totalOutcomes / totalForStage : 0;

            await supabase
              .from('next_best_actions')
              .update({ success_rate: Math.round(successRate * 100) / 100 })
              .eq('id', nba.id);
          }
        }

        totalMined += convertedClientIds.length;
        console.log(`[mine-actions] Org ${currentOrgId}: mined ${convertedClientIds.length} conversions, ${Object.keys(stagePaths).length} patterns`);

      } catch (orgError) {
        console.error(`[mine-actions] Error for org ${currentOrgId}:`, orgError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        organizations: orgIds.length,
        total_mined: totalMined,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[mine-conversation-actions] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
