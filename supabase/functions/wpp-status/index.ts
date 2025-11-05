import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Utility to mask secrets in logs
function maskSecret(secret: string): string {
  if (!secret || secret.length < 8) return '***';
  return `${secret.substring(0, 4)}***${secret.substring(secret.length - 4)}`;
}

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
    
    let WPP_BASE_URL = Deno.env.get('WPP_BASE_URL') || 'https://msg.academyos.ru';
    const WPP_AGG_TOKEN = Deno.env.get('WPP_AGG_TOKEN');

    if (!WPP_AGG_TOKEN) {
      throw new Error('WPP_AGG_TOKEN is not configured');
    }
    if (!WPP_BASE_URL) {
      throw new Error('WPP_BASE_URL is not configured');
    }

    // Ensure base URL has protocol
    if (!WPP_BASE_URL.startsWith('http://') && !WPP_BASE_URL.startsWith('https://')) {
      WPP_BASE_URL = `http://${WPP_BASE_URL}`;
    }
    console.log('Final WPP_BASE_URL:', WPP_BASE_URL);
    console.log('WPP_AGG_TOKEN (masked):', maskSecret(WPP_AGG_TOKEN));

    console.log('Checking WPP status for session:', sessionName);

    // Check existing session in DB first
    const { data: existingSession } = await supabaseClient
      .from('whatsapp_sessions')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    // Generate token (POST then fallback to GET; accept JSON or plain text)
    console.log('Generating token for session:', sessionName);
    const tokenUrl = `${WPP_BASE_URL}/api/${encodeURIComponent(sessionName)}/${WPP_AGG_TOKEN}/generate-token`;
    console.log('Token URL:', tokenUrl);

    const parseToken = async (response: Response, label: string): Promise<string | null> => {
      console.log(`Token response status (${label}):`, response.status);
      const ct = response.headers.get('content-type') || '';
      const text = await response.text();
      console.log(`Token response content-type (${label}):`, ct);
      console.log(`Token response body (${label}):`, text);

      if (!response.ok) return null;

      if (ct.includes('application/json')) {
        try {
          const json = JSON.parse(text);
          if (json?.token && typeof json.token === 'string') return json.token;
        } catch (e) {
          console.error('Failed to parse token JSON:', e);
        }
      }
      if (text && text.trim().length > 0) return text.trim();
      const headerAuth = response.headers.get('authorization') || response.headers.get('Authorization');
      const headerToken = response.headers.get('x-token') || response.headers.get('X-Token');
      if (headerAuth) return headerAuth.replace(/^Bearer\s+/i, '').trim();
      if (headerToken) return headerToken.trim();
      return null;
    };

    let tokenRes = await fetch(tokenUrl, { method: 'POST', headers: { 'Authorization': `Bearer ${WPP_AGG_TOKEN}` } });
    let wppToken = await parseToken(tokenRes, 'POST');
    if (!wppToken) {
      console.log('Retry token fetch with GET');
      tokenRes = await fetch(tokenUrl, { method: 'GET', headers: { 'Authorization': `Bearer ${WPP_AGG_TOKEN}` } });
      wppToken = await parseToken(tokenRes, 'GET');
    }
    if (!wppToken) {
      console.warn('Falling back to aggregator token for status');
      wppToken = WPP_AGG_TOKEN as string;
    }

    // Check connection status
    console.log('Checking connection status');
    
    async function checkStatusWithBearer(token: string): Promise<Response> {
      const url = `${WPP_BASE_URL}/api/${encodeURIComponent(sessionName)}/check-connection-session`;
      console.log('Status check URL (method=bearer):', url);
      return await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
    }
    
    async function checkStatusWithSecretPath(): Promise<Response> {
      const url = `${WPP_BASE_URL}/api/${encodeURIComponent(sessionName)}/${WPP_AGG_TOKEN}/check-connection-session`;
      console.log('Status check URL (method=secret-path, masked):', url.replace(WPP_AGG_TOKEN, maskSecret(WPP_AGG_TOKEN)));
      return await fetch(url);
    }

    let statusRes: Response;
    let statusMethod = 'bearer';

    if (wppToken) {
      statusRes = await checkStatusWithBearer(wppToken);
      console.log('Status check response status (bearer):', statusRes.status);
      
      if (!statusRes.ok && [400, 401, 403].includes(statusRes.status)) {
        console.warn('Bearer auth failed for status, trying secret-path fallback');
        statusRes = await checkStatusWithSecretPath();
        statusMethod = 'secret-path';
        console.log('Status check response status (secret-path):', statusRes.status);
      }
    } else {
      console.log('No token available, using secret-path for status');
      statusRes = await checkStatusWithSecretPath();
      statusMethod = 'secret-path';
      console.log('Status check response status (secret-path):', statusRes.status);
    }

    let statusData: any = { status: false };
    const statusCt = statusRes.headers.get('content-type') || '';
    const statusText = await statusRes.text();
    console.log(`Status check CT (${statusMethod}):`, statusCt);
    console.log(`Status check body (${statusMethod}):`, statusText.substring(0, 200));
    
    if (statusRes.ok && statusText && statusText.trim().length > 0) {
      try {
        statusData = JSON.parse(statusText);
        console.log('Parsed status data:', statusData);
      } catch (err) {
        console.error('Failed to parse status response:', err);
        // Keep default statusData = { status: false }
      }
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
    
    async function startSessionWithBearer(token: string): Promise<Response> {
      const url = `${WPP_BASE_URL}/api/${encodeURIComponent(sessionName)}/start-session`;
      console.log('Start session URL (method=bearer):', url);
      return await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: webhookUrl,
            secret: WPP_AGG_TOKEN,
          },
          waitQrCode: true,
          useChrome: true,
          headless: true,
          browserArgs: ['--no-sandbox', '--disable-dev-shm-usage', '--no-first-run', '--no-zygote'],
        }),
      });
    }
    
    async function startSessionWithSecretPath(): Promise<Response> {
      const url = `${WPP_BASE_URL}/api/${encodeURIComponent(sessionName)}/${WPP_AGG_TOKEN}/start-session`;
      console.log('Start session URL (method=secret-path, masked):', url.replace(WPP_AGG_TOKEN, maskSecret(WPP_AGG_TOKEN)));
      return await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: webhookUrl,
            secret: WPP_AGG_TOKEN,
          },
          waitQrCode: true,
          useChrome: true,
          headless: true,
          browserArgs: ['--no-sandbox', '--disable-dev-shm-usage', '--no-first-run', '--no-zygote'],
        }),
      });
    }

    let startRes: Response;
    let startMethod = 'bearer';

    if (wppToken) {
      startRes = await startSessionWithBearer(wppToken);
      console.log('Start session response status (bearer):', startRes.status);
      
      if (!startRes.ok && [400, 401, 403].includes(startRes.status)) {
        console.warn('Bearer auth failed for start-session, trying secret-path fallback');
        startRes = await startSessionWithSecretPath();
        startMethod = 'secret-path';
        console.log('Start session response status (secret-path):', startRes.status);
      }
    } else {
      console.log('No token available, using secret-path for start-session');
      startRes = await startSessionWithSecretPath();
      startMethod = 'secret-path';
      console.log('Start session response status (secret-path):', startRes.status);
    }
    
    const startCt = startRes.headers.get('content-type') || '';
    const startText = await startRes.text();
    console.log(`Start session CT (${startMethod}):`, startCt);
    console.log(`Start session body (${startMethod}):`, startText.substring(0, 200));
    
    if (!startRes.ok) {
      console.error(`Start session failed (${startMethod}):`, startText.substring(0, 200));
      throw new Error(`Failed to start session: ${startRes.status}`);
    }

    let startData: any = {};
    
    // Try to parse JSON if content-type suggests it
    if (startCt.includes('application/json') && startText && startText.trim().length > 0) {
      try {
        startData = JSON.parse(startText);
        console.log('Parsed start session data:', startData);
      } catch (e: any) {
        console.error('Failed to parse start-session JSON:', e);
      }
    }
    
    // If we got an empty response but status was 200, treat as success without QR
    // (the session might be starting in the background)
    const qrCode = startData?.qrcode || startData?.qr || null;
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
