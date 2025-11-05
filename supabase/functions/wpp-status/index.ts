import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { WppClient } from '../_shared/wpp.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE = Deno.env.get('WPP_BASE_URL') || 'https://msg.academyos.ru';
const SECRET = Deno.env.get('WPP_SECRET') || '';

console.log('[wpp-status] Configuration:', {
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

    console.log('[wpp-status] Org ID:', orgId);
    console.log('[wpp-status] Session:', sessionName);

    // Check cached QR from DB
    const { data: session } = await supabaseClient
      .from('whatsapp_sessions')
      .select('status, last_qr_b64, last_qr_at')
      .eq('organization_id', orgId)
      .single();

    // If we have a recent QR (< 25s) and status is qr_issued, return it to avoid hammering WPP
    if (session?.status === 'qr_issued' && session.last_qr_b64 && session.last_qr_at) {
      const qrAge = Date.now() - new Date(session.last_qr_at).getTime();
      if (qrAge < 25 * 1000) {
        console.log('[wpp-status] Returning cached QR (age', Math.round(qrAge/1000), 's)');
        return new Response(
          JSON.stringify({ status: 'qr_issued', qrcode: session.last_qr_b64 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // If already connected, return early
    if (session?.status === 'connected') {
      console.log('[wpp-status] Already connected');
      return new Response(
        JSON.stringify({ status: 'connected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Otherwise, check live status
    const wpp = new WppClient({
      baseUrl: BASE,
      session: sessionName,
      secret: SECRET,
      pollSeconds: 10, // Shorter polling for status check
    });

    const result = await wpp.ensureSessionWithQr();

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
        }, { onConflict: 'organization_id' });

      return new Response(
        JSON.stringify({ status: 'qr_issued', qrcode: result.base64 }),
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
        }, { onConflict: 'organization_id' });

      return new Response(
        JSON.stringify({ status: 'connected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // timeout or error
    return new Response(
      JSON.stringify({ status: 'qr_pending', message: 'QR code not ready yet' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[wpp-status] Error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
