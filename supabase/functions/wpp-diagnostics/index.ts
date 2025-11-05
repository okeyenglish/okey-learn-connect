import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE = Deno.env.get('WPP_BASE_URL') || 'https://msg.academyos.ru';
const SECRET = Deno.env.get('WPP_SECRET_KEY') || 'THISISMYSECURETOKEN';
const TIMEOUT = 5000;

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
      headers: {
        contentType: res.headers.get('Content-Type'),
        contentLength: res.headers.get('Content-Length'),
        location: res.headers.get('Location'),
        server: res.headers.get('Server'),
        xPoweredBy: res.headers.get('X-Powered-By'),
      },
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      throw new Error('Organization not found');
    }

    const sessionName = `org_${profile.organization_id}`;

    console.info('[wpp-diagnostics] Starting diagnostics for:', sessionName);

    const standardHeaders = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'SupabaseEdge/1.0',
      'Cache-Control': 'no-cache',
    };

    const tests: any[] = [];

    // Generate token endpoints
    const tokenTests = [
      { method: 'POST', url: `${BASE}/api/${sessionName}/${SECRET}/generate-token`, headers: standardHeaders, label: 'Token: POST secret in path' },
      { method: 'POST', url: `${BASE}/api/${sessionName}/${SECRET}/generate-token/`, headers: standardHeaders, label: 'Token: POST secret in path (/)' },
      { method: 'POST', url: `${BASE}/api/${sessionName}/generate-token`, headers: standardHeaders, body: { secretKey: SECRET }, label: 'Token: POST secretKey in body' },
      { method: 'GET', url: `${BASE}/api/${sessionName}/${SECRET}/generate-token`, headers: standardHeaders, label: 'Token: GET secret in path' },
      { method: 'GET', url: `${BASE}/api/${sessionName}/generate-token?secretKey=${SECRET}`, headers: standardHeaders, label: 'Token: GET secretKey query' },
      { method: 'GET', url: `${BASE}/api/${sessionName}/${SECRET}/generate-token?json=true`, headers: standardHeaders, label: 'Token: GET secret+json flag' },
    ];

    // Status endpoints
    const statusTests = [
      { method: 'GET', url: `${BASE}/api/${sessionName}/${SECRET}/status-session`, headers: standardHeaders, label: 'Status: GET secret in path' },
      { method: 'GET', url: `${BASE}/api/${sessionName}/${SECRET}/status-session/`, headers: standardHeaders, label: 'Status: GET secret in path (/)' },
      { method: 'GET', url: `${BASE}/api/${sessionName}/status-session?secretKey=${SECRET}`, headers: standardHeaders, label: 'Status: GET secretKey query' },
      { method: 'GET', url: `${BASE}/api/${sessionName}/${SECRET}/check-connection-session`, headers: standardHeaders, label: 'Status: GET check-connection' },
      { method: 'GET', url: `${BASE}/api/${sessionName}/status-session?secretKey=${SECRET}&json=true`, headers: standardHeaders, label: 'Status: GET secretKey+json' },
    ];

    // QR code endpoints
    const qrTests = [
      { method: 'GET', url: `${BASE}/api/${sessionName}/${SECRET}/qrcode`, headers: standardHeaders, label: 'QR: GET secret in path' },
      { method: 'GET', url: `${BASE}/api/${sessionName}/${SECRET}/qrcode/`, headers: standardHeaders, label: 'QR: GET secret in path (/)' },
      { method: 'GET', url: `${BASE}/api/${sessionName}/qrcode?secretKey=${SECRET}`, headers: standardHeaders, label: 'QR: GET secretKey query' },
      { method: 'GET', url: `${BASE}/api/${sessionName}/${SECRET}/qr-code`, headers: standardHeaders, label: 'QR: GET qr-code variant' },
      { method: 'GET', url: `${BASE}/api/${sessionName}/${SECRET}/get-qr-code`, headers: standardHeaders, label: 'QR: GET get-qr-code variant' },
      { method: 'GET', url: `${BASE}/api/${sessionName}/qrcode?secretKey=${SECRET}&json=true`, headers: standardHeaders, label: 'QR: GET secretKey+json' },
    ];

    // Start session endpoint
    const startTests = [
      { method: 'POST', url: `${BASE}/api/${sessionName}/${SECRET}/start-session`, headers: standardHeaders, body: { webhook: `${supabaseUrl}/functions/v1/wpp-webhook`, waitQrCode: true }, label: 'Start: POST secret in path' },
      { method: 'POST', url: `${BASE}/api/${sessionName}/start-session?secretKey=${SECRET}`, headers: standardHeaders, body: { webhook: `${supabaseUrl}/functions/v1/wpp-webhook`, waitQrCode: true }, label: 'Start: POST secretKey query' },
    ];

    // Run all tests
    const allTests = [...tokenTests, ...statusTests, ...qrTests, ...startTests];
    
    for (const test of allTests) {
      const result = await testEndpoint(test);
      tests.push(result);
    }

    // Summary
    const summary = {
      totalTests: tests.length,
      successful: tests.filter((t) => t.ok).length,
      errors: tests.filter((t) => t.error).length,
      emptyResponses: tests.filter((t) => t.ok && t.bodyLength === 0).length,
      withQR: tests.filter((t) => t.hasQR).length,
      withToken: tests.filter((t) => t.hasToken).length,
      withStatus: tests.filter((t) => t.hasStatus).length,
    };

    console.info('[wpp-diagnostics] Completed:', summary);

    return new Response(
      JSON.stringify({
        ok: true,
        sessionName,
        baseUrl: BASE,
        secretMasked: maskSecret(SECRET),
        summary,
        tests,
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
