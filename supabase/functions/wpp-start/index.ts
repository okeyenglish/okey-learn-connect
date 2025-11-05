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
    console.log('WPP_SECRET (masked):', maskSecret(WPP_SECRET));

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

    // Fetch token from WPP (attempt POST, then GET; handle JSON or plain text response)
    async function fetchWppToken(session: string): Promise<string | null> {
      const tokenEndpoint = `${WPP_HOST}/api/${session}/${WPP_SECRET}/generate-token`;
      console.log('Token endpoint (masked):', tokenEndpoint.replace(WPP_SECRET, maskSecret(WPP_SECRET)));

      async function tryFetch(method: string): Promise<string | null> {
        try {
          const resp = await fetch(tokenEndpoint, {
            method,
            headers: { Accept: 'application/json' },
          });

          const ct = resp.headers.get('content-type') || '';
          console.log(`Token CT (${method}):`, ct);

          if (!resp.ok) {
            console.warn(`Token ${method} failed: status=${resp.status}`);
            return null;
          }

          const text = await resp.text();
          if (ct.includes('application/json') && text) {
            try {
              const json = JSON.parse(text);
              if (json?.token && typeof json.token === 'string') {
                console.log(`Token obtained via ${method} (JSON)`);
                return json.token;
              }
            } catch (e) {
              console.error(`Failed to parse token JSON (${method}):`, e);
            }
          }

          const trimmed = text.trim();
          if (trimmed.length > 0) {
            console.log(`Token in plain text (${method}, len=${trimmed.length})`);
            return trimmed;
          }

          return null;
        } catch (err) {
          console.error(`Token ${method} error:`, err);
          return null;
        }
      }

      let token = await tryFetch('POST');
      if (token) return token;

      token = await tryFetch('GET');
      if (token) return token;

      console.warn('Could not obtain token from generate-token endpoint');
      return null;
    }

    const wppToken = await fetchWppToken(sessionName);
    console.log('WPP Token obtained:', wppToken ? 'yes' : 'no');

    // Start session and get QR code
    console.log('Starting WhatsApp session...');
    
    async function startSessionWithBearer(token: string): Promise<Response> {
      const url = `${WPP_HOST}/api/${sessionName}/start-session`;
      console.log('Start session URL (method=bearer):', url);
      
      return await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: `${PUBLIC_URL}/functions/v1/wpp-webhook`,
            secret: WPP_SECRET,
          },
          waitQrCode: true,
          useChrome: true,
          headless: true,
          browserArgs: ['--no-sandbox', '--disable-dev-shm-usage', '--no-first-run', '--no-zygote'],
        }),
      });
    }
    
    async function startSessionWithSecretPath(): Promise<Response> {
      const url = `${WPP_HOST}/api/${sessionName}/${WPP_SECRET}/start-session`;
      console.log('Start session URL (method=secret-path, masked):', url.replace(WPP_SECRET, maskSecret(WPP_SECRET)));
      
      return await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: `${PUBLIC_URL}/functions/v1/wpp-webhook`,
            secret: WPP_SECRET,
          },
          waitQrCode: true,
          useChrome: true,
          headless: true,
          browserArgs: ['--no-sandbox', '--disable-dev-shm-usage', '--no-first-run', '--no-zygote'],
        }),
      });
    }

    let startResponse: Response;
    let authMethod = 'bearer';

    if (wppToken) {
      startResponse = await startSessionWithBearer(wppToken);
      console.log('Start session response status (bearer):', startResponse.status);
      
      // If bearer auth fails with 400/401/403, try secret-path fallback
      if (!startResponse.ok && [400, 401, 403].includes(startResponse.status)) {
        console.warn('Bearer auth failed, trying secret-path fallback');
        startResponse = await startSessionWithSecretPath();
        authMethod = 'secret-path';
        console.log('Start session response status (secret-path):', startResponse.status);
      }
    } else {
      // No token obtained, go directly to secret-path
      console.log('No token available, using secret-path');
      startResponse = await startSessionWithSecretPath();
      authMethod = 'secret-path';
      console.log('Start session response status (secret-path):', startResponse.status);
    }

    const startCt = startResponse.headers.get('content-type') || '';
    console.log(`Start session CT (${authMethod}):`, startCt);

    if (!startResponse.ok) {
      const startBody = await startResponse.text();
      console.error(`Start session failed (${authMethod}):`, startResponse.status, startCt, 'body:', startBody.substring(0, 200));
      throw new Error(`Failed to start session: ${startResponse.status}`);
    }

    const startBody = await startResponse.text();
    console.log(`Start session body (${authMethod}):`, startBody.substring(0, 300));

    let responseData: any = {};
    let isConnected = false;
    let qrCode: string | null = null;
    let status = 'disconnected';

    // If we got a response body, try to parse it
    if (startBody && startBody.trim().length > 0) {
      if (startCt.includes('application/json')) {
        try {
          responseData = JSON.parse(startBody);
          console.log(`Start session data (${authMethod}):`, responseData);
          
          isConnected = responseData?.status === 'CONNECTED' || responseData?.state === 'CONNECTED';
          qrCode = responseData?.qrcode || null;
          status = isConnected ? 'connected' : (qrCode ? 'qr_issued' : 'disconnected');
        } catch (e: any) {
          console.error(`Failed to parse start-session JSON (${authMethod}):`, e);
          // Empty response with 200 - session is initializing asynchronously
          status = 'disconnected';
        }
      } else {
        console.warn(`Start session returned non-JSON (${authMethod}):`, startCt, 'treating as async initialization');
        // Empty or non-JSON response with 200 - session is initializing
        status = 'disconnected';
      }
    } else {
      console.info(`Start session returned empty body (${authMethod}) - session initializing asynchronously`);
      // Empty response with 200 - session is initializing via webhook
      status = 'disconnected';
    }

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
