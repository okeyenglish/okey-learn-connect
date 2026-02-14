import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { corsHeaders } from '../_shared/types.ts';

/**
 * Nightly job: refresh working memory tiers and apply freshness decay.
 * Called by cron, no JWT required.
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[refresh-working-memory] Starting nightly refresh...');

    // Get all organizations that have conversation examples
    const { data: orgs } = await supabase
      .from('conversation_examples')
      .select('organization_id')
      .limit(1000);

    const uniqueOrgs = [...new Set((orgs || []).map(o => o.organization_id))];
    console.log(`[refresh-working-memory] Processing ${uniqueOrgs.length} organizations`);

    let totalUpdated = 0;

    for (const orgId of uniqueOrgs) {
      try {
        // Apply freshness decay
        const { data: decayResult } = await supabase.rpc('refresh_working_memory', {
          p_organization_id: orgId
        });

        // Count results
        const { count } = await supabase
          .from('conversation_examples')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('memory_tier', 'working');

        console.log(`[refresh-working-memory] Org ${orgId}: ${count || 0} in working memory`);
        totalUpdated++;
      } catch (err) {
        console.error(`[refresh-working-memory] Error for org ${orgId}:`, err);
      }
    }

    console.log(`[refresh-working-memory] Done: ${totalUpdated} orgs processed`);

    return new Response(
      JSON.stringify({ success: true, organizations: totalUpdated }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[refresh-working-memory] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
