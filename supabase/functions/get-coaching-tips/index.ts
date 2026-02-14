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
    const limit = body.limit || 30;
    const managerId = body.manager_id;

    if (!organizationId) {
      return new Response(JSON.stringify({ error: 'organization_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let query = supabase
      .from('manager_coaching_tips')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (managerId) {
      query = query.eq('manager_id', managerId);
    }

    const { data: tips, error } = await query;

    if (error) {
      console.error('[get-coaching-tips] Error:', error);
      throw new Error(error.message);
    }

    // Enrich with manager names from profiles
    const managerIds = [...new Set((tips || []).map((t: any) => t.manager_id).filter(Boolean))];

    let managerNames: Record<string, string> = {};
    if (managerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', managerIds);

      if (profiles) {
        for (const p of profiles) {
          managerNames[p.id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.id.slice(0, 8);
        }
      }
    }

    const enriched = (tips || []).map((t: any) => ({
      ...t,
      manager_name: managerNames[t.manager_id] || t.manager_id?.slice(0, 8) || 'Unknown',
    }));

    return successResponse(enriched);
  } catch (error) {
    console.error('[get-coaching-tips] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
