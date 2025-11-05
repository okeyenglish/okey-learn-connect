import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { WppClient } from '../_shared/wpp.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE = Deno.env.get('WPP_BASE_URL') || 'https://msg.academyos.ru';
const SECRET = Deno.env.get('WPP_SECRET') || '';

console.log('[wpp-disconnect] Configuration:', {
  BASE,
  SECRET: SECRET ? `${SECRET.substring(0, 4)}***${SECRET.slice(-4)}` : 'MISSING'
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return new Response(JSON.stringify({ error: 'Organization not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const orgId = profile.organization_id;
    // Use org-specific session (without dashes for WPP compatibility)
    const sessionName = `org_${orgId.replace(/-/g, '')}`;

    console.log('[wpp-disconnect] Org ID:', orgId);
    console.log('[wpp-disconnect] Session:', sessionName);

    // Use WppClient SDK
    const wpp = new WppClient({
      baseUrl: BASE,
      session: sessionName,
      secret: SECRET,
    });

    const wppToken = await wpp.getToken();
    await wpp.logout(wppToken);

    // Update session status in DB
    await supabaseClient
      .from('whatsapp_sessions')
      .upsert({
        organization_id: orgId,
        session_name: sessionName,
        status: 'disconnected',
        last_qr_b64: null,
        last_qr_at: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id' });

    return new Response(
      JSON.stringify({ ok: true, status: 'disconnected' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[wpp-disconnect] Error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
