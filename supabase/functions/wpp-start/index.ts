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
    const PUBLIC_URL = Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '');

    // Generate token for this session
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
    
    const tokenData = await tokenRes.json();
    
    if (!tokenData?.token) {
      throw new Error('Failed to generate WPP token: no token in response');
    }

    const wppToken = tokenData.token;

    // Start session with webhook
    const webhookUrl = `${PUBLIC_URL}/functions/v1/wpp-webhook`;
    console.log('Starting session with webhook:', webhookUrl);
    
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

    const startData = await startRes.json();
    console.log('WPP start-session response:', startData);

    // Determine status
    const isConnected = startData?.status === 'CONNECTED' || startData?.state === 'CONNECTED';
    const qrCode = startData?.qrcode || null;
    const status = isConnected ? 'connected' : (qrCode ? 'qr_issued' : 'disconnected');

    // Upsert session in database
    const { data: session } = await supabaseClient
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
      })
      .select()
      .single();

    return new Response(
      JSON.stringify({
        ok: true,
        session: sessionName,
        status,
        qrcode: qrCode,
        organizationId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in wpp-start:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
