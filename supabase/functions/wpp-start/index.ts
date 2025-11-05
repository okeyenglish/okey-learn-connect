import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { WppClient } from '../_shared/wpp.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE = Deno.env.get('WPP_BASE_URL') || 'https://msg.academyos.ru';
const SECRET = Deno.env.get('WPP_SECRET') || '';

console.log('[wpp-start] Configuration:', {
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

    // Read request body for custom session suffix
    const body = await req.json().catch(() => ({}));
    const sessionSuffix = body?.session_suffix || '';

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
    // Add optional suffix for multiple sessions per organization
    const baseSessionName = `org_${orgId.replace(/-/g, '')}`;
    const sessionName = sessionSuffix ? `${baseSessionName}_${sessionSuffix}` : baseSessionName;
    const PUBLIC_URL = Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '');
    const webhookUrl = `${PUBLIC_URL}/functions/v1/wpp-webhook`;

    console.log('[wpp-start] Org ID:', orgId);
    console.log('[wpp-start] Session:', sessionName);
    console.log('[wpp-start] Session suffix:', sessionSuffix || 'none');
    console.log('[wpp-start] Webhook URL:', webhookUrl);

    // Use WppClient SDK
    const wpp = new WppClient({
      baseUrl: BASE,
      session: sessionName,
      secret: SECRET,
      pollSeconds: 30,
    });

    const result = await wpp.ensureSessionWithQr(webhookUrl);

    if (result.state === 'qr') {
      await supabaseClient
        .from('whatsapp_sessions')
        .upsert({
          organization_id: orgId,
          session_name: sessionName,
          status: 'qr_issued',
          last_qr_b64: result.base64,
          last_qr_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'session_name' });

      return new Response(
        JSON.stringify({ ok: true, status: 'qr_issued', qrcode: result.base64, session_name: sessionName }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (result.state === 'connected') {
      await supabaseClient
        .from('whatsapp_sessions')
        .upsert({
          organization_id: orgId,
          session_name: sessionName,
          status: 'connected',
          last_qr_b64: null,
          last_qr_at: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'session_name' });

      return new Response(
        JSON.stringify({ ok: true, status: 'connected', session_name: sessionName }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (result.state === 'timeout') {
      return new Response(
        JSON.stringify({ ok: false, error: 'Timeout waiting for QR code' }),
        { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // error state
    return new Response(
      JSON.stringify({ ok: false, error: result.state === 'error' ? result.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[wpp-start] Error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
