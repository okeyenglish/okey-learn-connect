import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
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

    // Get user's organization
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

    const organizationId = profile.organization_id;
    const sessionName = `org_${organizationId}`;
    
    const WPP_HOST = Deno.env.get('WPP_HOST') || 'https://msg.academyos.ru';
    const WPP_SECRET = Deno.env.get('WPP_SECRET');

    // Check existing session in DB first
    const { data: existingSession } = await supabaseClient
      .from('whatsapp_sessions')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    // Generate token
    const tokenRes = await fetch(
      `${WPP_HOST}/api/${encodeURIComponent(sessionName)}/${WPP_SECRET}/generate-token`,
      { method: 'POST' }
    );
    const tokenData = await tokenRes.json();
    
    if (!tokenData?.token) {
      throw new Error('Failed to generate WPP token');
    }

    const wppToken = tokenData.token;

    // Check connection status
    const statusRes = await fetch(
      `${WPP_HOST}/api/${encodeURIComponent(sessionName)}/check-connection-session`,
      {
        headers: { 'Authorization': `Bearer ${wppToken}` },
      }
    );

    let statusData;
    try {
      statusData = await statusRes.json();
    } catch {
      statusData = { status: false };
    }

    const isConnected = statusData?.status === true || statusData?.state === 'CONNECTED';

    if (isConnected) {
      // Connected - update DB
      await supabaseClient
        .from('whatsapp_sessions')
        .upsert({
          organization_id: organizationId,
          session_name: sessionName,
          status: 'connected',
          last_qr_b64: null,
          last_qr_at: null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'organization_id',
        });

      return new Response(
        JSON.stringify({
          ok: true,
          status: 'connected',
          qrcode: null,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Not connected - check if we have recent QR
    if (existingSession?.last_qr_b64 && existingSession?.last_qr_at) {
      const qrAge = Date.now() - new Date(existingSession.last_qr_at).getTime();
      
      // QR codes expire after ~45 seconds, so if less than 40 sec old, reuse it
      if (qrAge < 40000) {
        return new Response(
          JSON.stringify({
            ok: true,
            status: 'qr_issued',
            qrcode: existingSession.last_qr_b64,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Need new QR - start session
    const PUBLIC_URL = Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '');
    const webhookUrl = `${PUBLIC_URL}/functions/v1/wpp-webhook`;
    
    const startRes = await fetch(
      `${WPP_HOST}/api/${encodeURIComponent(sessionName)}/start-session`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${wppToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: webhookUrl,
            secret: WPP_SECRET,
          },
          waitQrCode: true,
          useChrome: true,
          headless: true,
          browserArgs: ['--no-sandbox', '--disable-dev-shm-usage', '--no-first-run', '--no-zygote'],
        }),
      }
    );

    const startData = await startRes.json();
    const qrCode = startData?.qrcode || null;
    const status = qrCode ? 'qr_issued' : 'disconnected';

    // Update DB with new QR
    await supabaseClient
      .from('whatsapp_sessions')
      .upsert({
        organization_id: organizationId,
        session_name: sessionName,
        status,
        last_qr_b64: qrCode,
        last_qr_at: qrCode ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id',
      });

    return new Response(
      JSON.stringify({
        ok: true,
        status,
        qrcode: qrCode,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in wpp-status:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
