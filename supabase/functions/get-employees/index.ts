import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { EdgeCache, CacheTTL, hashKey } from '../_shared/cache.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log('[get-employees] Function booted');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { branch, skipCache } = await req.json().catch(() => ({ branch: null, skipCache: false }));

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize cache
    const cache = new EdgeCache(supabase, 'employees');
    const cacheKey = `list:${branch || 'all'}`;

    // Try to get from cache first (unless skipCache is true)
    if (!skipCache) {
      const cached = await cache.get<{ employees: unknown[] }>(cacheKey);
      if (cached) {
        console.log(`[get-employees] Returning cached data for ${cacheKey}`);
        return new Response(JSON.stringify({ ...cached, fromCache: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Build query
    let query = supabase
      .from('profiles')
      .select('id, first_name, last_name, email, phone, branch, department')
      .order('first_name', { ascending: true });

    if (branch) {
      query = query.eq('branch', branch);
    }

    const [
      { data: employees, error: profilesError },
      { data: rolesData, error: rolesError }
    ] = await Promise.all([
      query,
      supabase.from('user_roles').select('user_id, role')
    ]);

    if (profilesError) throw profilesError;
    if (rolesError) throw rolesError;

    const rolesByUser = new Map<string, string[]>();
    (rolesData || []).forEach((r: { user_id: string; role: string }) => {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    });

    const enriched = (employees || []).map((e: { id: string; [key: string]: unknown }) => ({
      ...e,
      roles: rolesByUser.get(e.id) ?? []
    }));

    const result = { employees: enriched };

    // Cache the result for 5 minutes
    await cache.set(cacheKey, result, { ttlSeconds: CacheTTL.MEDIUM });

    console.log(`[get-employees] Fetched and cached ${enriched.length} employees`);

    return new Response(JSON.stringify({ ...result, fromCache: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[get-employees] Error:', error);
    const message = (error as Error)?.message ?? 'Server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
