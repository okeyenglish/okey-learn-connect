import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE = Deno.env.get('WPP_BASE_URL') || 'https://msg.academyos.ru';
const SECRET = Deno.env.get('WPP_SECRET_KEY') || 'THISISMYSECURETOKEN';
const TIMEOUT = 12000;

// Standard headers for all requests
const standardHeaders = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'User-Agent': 'SupabaseEdge/1.0',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
};

const standardHeadersAny = {
  'Accept': '*/*',
  'Content-Type': 'application/json',
  'User-Agent': 'SupabaseEdge/1.0',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
};

function maskSecret(str: string): string {
  if (!str || str.length < 8) return '***';
  return str.slice(0, 4) + '***' + str.slice(-4);
}

function maskSensitiveData(text: string): string {
  return text.replace(new RegExp(SECRET, 'g'), '*****');
}

async function testEndpoint(config: {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
  label: string;
}): Promise<any> {
  try {
    const startTime = Date.now();
    const res = await Promise.race([
      fetch(config.url, {
        method: config.method,
        headers: config.headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
      }),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), TIMEOUT)
      ),
    ]) as Response;

    const duration = Date.now() - startTime;
    let bodyText = '';
    let parsedData: any = null;
    let parseError: string | null = null;

    try {
      bodyText = await res.text();
      if (bodyText) {
        parsedData = JSON.parse(bodyText);
      }
    } catch (err: any) {
      parseError = err.message;
    }

    return {
      label: config.label,
      method: config.method,
      url: maskSensitiveData(config.url),
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
      redirected: res.redirected,
      contentType: res.headers.get('Content-Type'),
      contentLength: res.headers.get('Content-Length'),
      serverHeader: res.headers.get('Server') || res.headers.get('X-Powered-By'),
      bodyLength: bodyText.length,
      bodyPreview: maskSensitiveData(bodyText.slice(0, 200)),
      parsedKeys: parsedData ? Object.keys(parsedData) : null,
      hasQR: parsedData ? !!(parsedData.qrcode || parsedData.qr || parsedData.base64 || parsedData.image) : false,
      hasToken: parsedData ? !!(parsedData.token || parsedData.access_token) : false,
      hasStatus: parsedData ? !!(parsedData.connected || parsedData.status || parsedData.state) : false,
      parseError,
      duration,
    };
  } catch (err: any) {
    return {
      label: config.label,
      method: config.method,
      url: maskSensitiveData(config.url),
      error: err.message,
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }
    console.info(`[wpp-diagnostics] Auth header present, length: ${authHeader.length}`);

    // Extract JWT token from "Bearer <token>"
    const jwtToken = authHeader.replace('Bearer ', '').trim();
    if (!jwtToken) {
      throw new Error('Invalid token format');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    });

    // Pass JWT token explicitly to getUser
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwtToken);
    let userId: string | null = user?.id || null;
    if (authError || !userId) {
      console.warn('[wpp-diagnostics] auth.getUser failed, attempting JWT decode');
      try {
        const payload = JSON.parse(atob(jwtToken.split('.')[1] || ''));
        userId = payload?.sub || null;
      } catch {
        throw new Error('Authentication failed');
      }
    }


    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (!profile?.organization_id) {
      throw new Error('Organization not found');
    }

    const sessionName = `org_${profile.organization_id}`;

    console.info('[wpp-diagnostics] Starting diagnostics for:', sessionName);

    const tests: any[] = [];
    let wppToken: string | null = null;

    // First, try to generate token
    const tokenTests = [
      { method: 'POST', url: `${BASE}/api/${sessionName}/${SECRET}/generate-token`, headers: standardHeaders, label: 'Token: POST secret (JSON)' },
      { method: 'POST', url: `${BASE}/api/${sessionName}/${SECRET}/generate-token`, headers: standardHeadersAny, label: 'Token: POST secret (ANY)' },
      { method: 'POST', url: `${BASE}/api/${sessionName}/${SECRET}/generate-token?json=true`, headers: standardHeaders, label: 'Token: POST json flag (JSON)' },
      { method: 'POST', url: `${BASE}/api/${sessionName}/${SECRET}/generate-token?json=true`, headers: standardHeadersAny, label: 'Token: POST json flag (ANY)' },
    ];

    for (const test of tokenTests) {
      const result = await testEndpoint(test);
      tests.push(result);
      if (result.hasToken && !wppToken) {
        wppToken = result.bodyPreview?.match(/"token":\s*"([^"]+)"/)?.[1] || null;
      }
    }

    // Status tests with and without WPP token
    const statusTests = [];
    for (const headers of [standardHeaders, standardHeadersAny]) {
      const authHeaders = wppToken ? { ...headers, 'Authorization': `Bearer ${wppToken}` } : headers;
      const acceptLabel = headers.Accept === '*/*' ? 'ANY' : 'JSON';
      statusTests.push(
        { method: 'GET', url: `${BASE}/api/${sessionName}/${SECRET}/status-session`, headers: authHeaders, label: `Status: secret (${acceptLabel}${wppToken ? '+token' : ''})` },
        { method: 'GET', url: `${BASE}/api/${sessionName}/${SECRET}/check-connection-session`, headers: authHeaders, label: `Check: secret (${acceptLabel}${wppToken ? '+token' : ''})` },
        { method: 'GET', url: `${BASE}/api/${sessionName}/${SECRET}/status-session?json=true`, headers: authHeaders, label: `Status: json flag (${acceptLabel}${wppToken ? '+token' : ''})` }
      );
    }

    for (const test of statusTests) {
      const result = await testEndpoint(test);
      tests.push(result);
    }

    // QR code tests with and without WPP token
    const qrTests = [];
    for (const headers of [standardHeaders, standardHeadersAny]) {
      const authHeaders = wppToken ? { ...headers, 'Authorization': `Bearer ${wppToken}` } : headers;
      const acceptLabel = headers.Accept === '*/*' ? 'ANY' : 'JSON';
      qrTests.push(
        { method: 'GET', url: `${BASE}/api/${sessionName}/${SECRET}/qrcode`, headers: authHeaders, label: `QR: /qrcode (${acceptLabel}${wppToken ? '+token' : ''})` },
        { method: 'GET', url: `${BASE}/api/${sessionName}/${SECRET}/qr-code`, headers: authHeaders, label: `QR: /qr-code (${acceptLabel}${wppToken ? '+token' : ''})` },
        { method: 'GET', url: `${BASE}/api/${sessionName}/${SECRET}/qrcode?json=true`, headers: authHeaders, label: `QR: json flag (${acceptLabel}${wppToken ? '+token' : ''})` }
      );
    }

    for (const test of qrTests) {
      const result = await testEndpoint(test);
      tests.push(result);
    }

    // Start session tests
    const webhookUrl = `${supabaseUrl}/functions/v1/wpp-webhook`;
    const startTests = [];
    for (const headers of [standardHeaders, standardHeadersAny]) {
      const authHeaders = wppToken ? { ...headers, 'Authorization': `Bearer ${wppToken}` } : headers;
      const acceptLabel = headers.Accept === '*/*' ? 'ANY' : 'JSON';
      startTests.push(
        { method: 'POST', url: `${BASE}/api/${sessionName}/${SECRET}/start-session`, headers: authHeaders, body: { webhook: webhookUrl, waitQrCode: true }, label: `Start: secret (${acceptLabel}${wppToken ? '+token' : ''})` },
        { method: 'POST', url: `${BASE}/api/${sessionName}/${SECRET}/start-session?json=true`, headers: authHeaders, body: { webhook: webhookUrl, waitQrCode: true }, label: `Start: json flag (${acceptLabel}${wppToken ? '+token' : ''})` }
      );
    }

    for (const test of startTests) {
      const result = await testEndpoint(test);
      tests.push(result);
    }

    // Enhanced summary
    const summary = {
      total: tests.length,
      successful: tests.filter((t) => t.ok).length,
      errors: tests.filter((t) => t.error).length,
      okButEmpty: tests.filter((t) => t.ok && t.bodyLength === 0).length,
      withQR: tests.filter((t) => t.hasQR).length,
      withToken: tests.filter((t) => t.hasToken).length,
      withStatus: tests.filter((t) => t.hasStatus).length,
      contentTypes: [...new Set(tests.map((t) => t.contentType).filter(Boolean))],
      servers: [...new Set(tests.map((t) => t.serverHeader).filter(Boolean))],
    };

    console.info('[wpp-diagnostics] Completed:', summary);

    return new Response(
      JSON.stringify({
        ok: true,
        sessionName,
        baseUrl: BASE,
        secretMasked: maskSecret(SECRET),
        tokenFound: !!wppToken,
        summary,
        results: tests,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[wpp-diagnostics] Error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
