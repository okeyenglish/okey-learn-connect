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
    
    let WPP_HOST = Deno.env.get('WPP_HOST') || 'https://msg.academyos.ru';
    const WPP_SECRET = Deno.env.get('WPP_SECRET');
    const PUBLIC_URL = Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '');

    if (!WPP_SECRET) {
      throw new Error('WPP_SECRET is not configured');
    }
    if (!WPP_HOST) {
      throw new Error('WPP_HOST is not configured');
    }

    // Ensure WPP_HOST has a protocol
    if (!WPP_HOST.startsWith('http://') && !WPP_HOST.startsWith('https://')) {
      WPP_HOST = `http://${WPP_HOST}`;
      console.log('Added http:// protocol to WPP_HOST:', WPP_HOST);
    }
    console.log('Final WPP_HOST:', WPP_HOST);

    // Optional health check (non-fatal if endpoint is missing but fatal on network/timeout)
    try {
      const healthUrl = `${WPP_HOST}/health`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const healthRes = await fetch(healthUrl, { method: 'GET', signal: controller.signal }).catch((e) => {
        console.error('Health check fetch error:', e?.message || e);
        throw e;
      });
      clearTimeout(timeoutId);
      console.log('Health check status:', healthRes.status);
      // If the server responds (even 404), we consider host reachable. Only network errors/timeout are fatal.
    } catch (e) {
      console.error('WPP host health check failed');
      return new Response(
        JSON.stringify({ ok: false, error: 'WPP host unreachable. Please verify WPP_HOST and network connectivity.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Helper function to fetch WPP token (tries POST, then GET)
    async function fetchWppToken(sessionName: string): Promise<string> {
      const baseUrl = `${WPP_HOST}/api/${encodeURIComponent(sessionName)}/${WPP_SECRET}/generate-token`;
      
      // Try POST first
      console.log('Trying POST to generate-token:', baseUrl);
      const postRes = await fetch(baseUrl, { 
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      });
      console.log('POST status:', postRes.status);
      
      const postCt = postRes.headers.get('content-type') || '';
      console.log('Token CT (POST):', postCt);
      
      if (postRes.ok) {
        if (postCt.includes('application/json')) {
          try {
            const data = await postRes.json();
            if (data?.token) return data.token;
          } catch (e) {
            console.warn('Failed to parse POST JSON:', e);
          }
        } else {
          const text = await postRes.text();
          const trimmed = text.trim();
          if (trimmed) {
            console.log(`Token in plain text (POST, len=${trimmed.length})`);
            return trimmed;
          }
        }
      }
      
      // Try GET fallback
      console.log('Trying GET to generate-token:', baseUrl);
      const getRes = await fetch(baseUrl, { 
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      console.log('GET status:', getRes.status);
      
      const getCt = getRes.headers.get('content-type') || '';
      console.log('Token CT (GET):', getCt);
      
      if (getRes.ok) {
        if (getCt.includes('application/json')) {
          try {
            const data = await getRes.json();
            if (data?.token) return data.token;
          } catch (e) {
            console.warn('Failed to parse GET JSON:', e);
          }
        } else {
          const text = await getRes.text();
          const trimmed = text.trim();
          if (trimmed) {
            console.log(`Token in plain text (GET, len=${trimmed.length})`);
            return trimmed;
          }
        }
      }
      
      // Both attempts failed
      const postBody = await postRes.text().catch(() => '');
      const getBody = await getRes.text().catch(() => '');
      throw new Error(
        `Failed to get WPP token. POST ${postRes.status} (${postCt}): ${postBody.substring(0, 100)}; GET ${getRes.status} (${getCt}): ${getBody.substring(0, 100)}`
      );
    }

    // Generate token for this session
    console.log('Generating token for session:', sessionName);
    const wppToken = await fetchWppToken(sessionName);

    // Start session with webhook
    const webhookUrl = `${PUBLIC_URL}/functions/v1/wpp-webhook`;
    console.log('Starting session with webhook:', webhookUrl);
    
    const startUrl = `${WPP_HOST}/api/${encodeURIComponent(sessionName)}/start-session`;
    console.log('Start session URL:', startUrl);
    const startRes = await fetch(startUrl,
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
    const startCt = startRes.headers.get('content-type') || '';
    console.log('Start session CT:', startCt);
    
    if (!startRes.ok) {
      const text = await startRes.text();
      console.error('Start session failed:', text.substring(0, 200));
      throw new Error(`Failed to start session: ${startRes.status} (${startCt}) - ${text.substring(0, 200)}`);
    }

    if (!startCt.includes('application/json')) {
      const text = await startRes.text();
      console.error('Start session returned non-JSON:', text.substring(0, 200));
      throw new Error(`Start session returned non-JSON (${startCt}): ${text.substring(0, 200)}`);
    }
    
    let startData: any;
    try {
      startData = await startRes.json();
    } catch (e: any) {
      const text = await startRes.text();
      console.error('Failed to parse start-session JSON:', text.substring(0, 200));
      throw new Error(`Failed to parse start-session JSON: ${e?.message || e} - ${text.substring(0, 200)}`);
    }
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
