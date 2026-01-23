import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { branch } = await req.json().catch(() => ({ branch: null }));

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    (rolesData || []).forEach((r: any) => {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    });

    const enriched = (employees || []).map((e: any) => ({
      ...e,
      roles: rolesByUser.get(e.id) ?? []
    }));

    return new Response(JSON.stringify({ employees: enriched }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('get-employees error:', error);
    const message = (error as any)?.message ?? 'Server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});