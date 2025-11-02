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

    if (!WPP_SECRET) {
      throw new Error('WPP_SECRET is not configured');
    }
    if (!WPP_HOST) {
      throw new Error('WPP_HOST is not configured');
    }

    console.log('Checking WPP status for session:', sessionName);

    // Check existing session in DB first
    const { data: existingSession } = await supabaseClient
      .from('whatsapp_sessions')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    // Generate token
    console.log('Generating token for session:', sessionName);
    const tokenRes = await fetch(
      `${WPP_HOST}/api/${encodeURIComponent(sessionName)}/${WPP_SECRET}/generate-token`,
      { method: 'POST' }
    );
    
    console.log('Token response status:', tokenRes.status);
    
    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error('Token generation failed:', text);
      throw new Error(`Failed to generate WPP token: ${tokenRes.status} - ${text.substring(0, 200)}`);
    }
    
    const tokenCt = tokenRes.headers.get('content-type') || '';
    if (!tokenCt.includes('application/json')) {
      const text = await tokenRes.text();
      throw new Error(`Token endpoint returned non-JSON (${tokenCt}): ${text.substring(0, 200)}`);
    }
    let tokenData: any;
    try {
      tokenData = await tokenRes.json();
    } catch (e: any) {
      const text = await tokenRes.text();
      throw new Error(`Failed to parse token JSON: ${e?.message || e} - ${text.substring(0, 200)}`);
    }
    
    if (!tokenData?.token) {
      throw new Error('Failed to generate WPP token: no token in response');
    }

    const wppToken = tokenData.token;

    // Check connection status
    console.log('Checking connection status');
    const statusRes = await fetch(
      `${WPP_HOST}/api/${encodeURIComponent(sessionName)}/check-connection-session`,
      {
        headers: { 'Authorization': `Bearer ${wppToken}` },
      }
    );

    console.log('Status check response status:', statusRes.status);

    let statusData;
    try {
      if (!statusRes.ok) {
        const text = await statusRes.text();
        console.error('Status check failed:', text);
        statusData = { status: false };
      } else {
        statusData = await statusRes.json();
        console.log('Status data:', statusData);
      }
    } catch (err) {
      console.error('Failed to parse status response:', err);
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
    
    console.log('Starting new session with webhook:', webhookUrl);
    
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

    console.log('Start session response status:', startRes.status);
    
    if (!startRes.ok) {
      const text = await startRes.text();
      console.error('Start session failed:', text);
      throw new Error(`Failed to start session: ${startRes.status} - ${text.substring(0, 200)}`);
    }

    const startCt = startRes.headers.get('content-type') || '';
    if (!startCt.includes('application/json')) {
      const text = await startRes.text();
      throw new Error(`Start session returned non-JSON (${startCt}): ${text.substring(0, 200)}`);
    }
    let startData: any;
    try {
      startData = await startRes.json();
    } catch (e: any) {
      const text = await startRes.text();
      throw new Error(`Failed to parse start-session JSON: ${e?.message || e} - ${text.substring(0, 200)}`);
    }
    console.log('Start session data:', startData);
    
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
