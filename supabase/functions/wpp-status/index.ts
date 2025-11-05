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

// Mask sensitive data
function maskSecret(str: string): string {
  if (!str || str.length < 8) return '***';
  return str.slice(0, 4) + '***' + str.slice(-4);
}

// Mask secret in URL/body
function maskSensitiveData(text: string): string {
  return text.replace(new RegExp(SECRET, 'g'), '*****');
}

// Timeout wrapper
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ]);
}

// Enhanced response logging
async function logResponse(label: string, res: Response): Promise<void> {
  const clonedRes = res.clone();
  let bodyText = '';
  try {
    bodyText = await clonedRes.text();
  } catch {}
  
  const bodyPreview = bodyText.slice(0, 300);
  
  console.info(`${label}: {
  url: "${maskSensitiveData(res.url)}",
  status: ${res.status},
  redirected: ${res.redirected},
  contentType: ${res.headers.get('Content-Type')},
  contentLength: "${res.headers.get('Content-Length')}",
  location: ${res.headers.get('Location')},
  bodyPreview: "${maskSensitiveData(bodyPreview)}"
}`);
}

// Generate token with multiple variants
async function generateToken(sessionName: string): Promise<string | null> {
  console.info(`[wpp-status] Attempting to generate token for: ${sessionName}`);

  const variants = [
    // POST secret in path
    { method: 'POST', url: `${BASE}/api/${sessionName}/${SECRET}/generate-token`, label: 'POST secret in path' },
    { method: 'POST', url: `${BASE}/api/${sessionName}/${SECRET}/generate-token/`, label: 'POST secret in path (/)' },
    // POST secretKey in body
    { method: 'POST', url: `${BASE}/api/${sessionName}/generate-token`, body: { secretKey: SECRET }, label: 'POST secretKey in body' },
    { method: 'POST', url: `${BASE}/api/${sessionName}/generate-token/`, body: { secretKey: SECRET }, label: 'POST secretKey in body (/)' },
    // GET secret in path
    { method: 'GET', url: `${BASE}/api/${sessionName}/${SECRET}/generate-token`, label: 'GET secret in path' },
    { method: 'GET', url: `${BASE}/api/${sessionName}/${SECRET}/generate-token/`, label: 'GET secret in path (/)' },
    // GET secretKey query
    { method: 'GET', url: `${BASE}/api/${sessionName}/generate-token?secretKey=${SECRET}`, label: 'GET secretKey query' },
    { method: 'GET', url: `${BASE}/api/${sessionName}/generate-token/?secretKey=${SECRET}`, label: 'GET secretKey query (/)' },
    // With ?json=true flag
    { method: 'POST', url: `${BASE}/api/${sessionName}/${SECRET}/generate-token?json=true`, label: 'POST secret+json flag' },
    { method: 'GET', url: `${BASE}/api/${sessionName}/${SECRET}/generate-token?json=true`, label: 'GET secret+json flag' },
  ];

  for (const variant of variants) {
    try {
      console.info(`[wpp-status] Try: ${variant.label}`);
      const res = await withTimeout(
        fetch(variant.url, {
          method: variant.method,
          headers: standardHeaders,
          body: variant.body ? JSON.stringify(variant.body) : undefined,
        }),
        TIMEOUT
      );
      
      await logResponse(`[wpp-status] ${variant.label}`, res);
      
      if (res.ok) {
        const text = await res.text();
        if (text) {
          try {
            const data = JSON.parse(text);
            const token = data?.token || data?.access_token || data?.result?.token;
            if (token) {
              console.info(`[wpp-status] Token generated via ${variant.label}`);
              return token;
            }
          } catch {}
        }
      }
    } catch (err: any) {
      console.warn(`[wpp-status] ${variant.label} error:`, err.message);
    }
  }

  console.warning('[wpp-status] All token generation attempts failed - proceeding with secret fallbacks');
  return null;
}

// Check connection status with multiple variants
async function checkConnection(sessionName: string, token: string | null): Promise<any> {
  console.info('[wpp-status] Checking connection');

  const endpoints = ['status-session', 'check-connection-session'];
  const variants: any[] = [];

  for (const endpoint of endpoints) {
    if (token) {
      variants.push({ method: 'GET', url: `${BASE}/api/${sessionName}/${endpoint}`, headers: { ...standardHeaders, Authorization: `Bearer ${token}` }, label: `Status Bearer token (${endpoint})` });
      variants.push({ method: 'GET', url: `${BASE}/api/${sessionName}/${endpoint}/`, headers: { ...standardHeaders, Authorization: `Bearer ${token}` }, label: `Status Bearer token+/ (${endpoint})` });
    }
    variants.push({ method: 'GET', url: `${BASE}/api/${sessionName}/${SECRET}/${endpoint}`, headers: standardHeaders, label: `Status secret in path (${endpoint})` });
    variants.push({ method: 'GET', url: `${BASE}/api/${sessionName}/${SECRET}/${endpoint}/`, headers: standardHeaders, label: `Status secret in path+/ (${endpoint})` });
    variants.push({ method: 'GET', url: `${BASE}/api/${sessionName}/${endpoint}?secretKey=${SECRET}`, headers: standardHeaders, label: `Status secretKey query (${endpoint})` });
    variants.push({ method: 'GET', url: `${BASE}/api/${sessionName}/${endpoint}/?secretKey=${SECRET}`, headers: standardHeaders, label: `Status secretKey query+/ (${endpoint})` });
    variants.push({ method: 'GET', url: `${BASE}/api/${sessionName}/${endpoint}?secretKey=${SECRET}&json=true`, headers: standardHeaders, label: `Status secretKey+json (${endpoint})` });
  }

  for (const variant of variants) {
    try {
      const res = await withTimeout(fetch(variant.url, { method: variant.method, headers: variant.headers }), TIMEOUT);
      await logResponse(`[wpp-status] ${variant.label}`, res);
      
      if (res.ok) {
        const text = await res.text();
        if (text) {
          try {
            const data = JSON.parse(text);
            const connected = data?.connected || data?.result?.connected || data?.status === 'CONNECTED' || data?.state === 'CONNECTED';
            if (connected) {
              console.info(`[wpp-status] Connected via ${variant.label}`);
              return { connected: true };
            }
            return data;
          } catch {}
        } else {
          console.warning(`[wpp-status] Status returned 200 but empty body - treating as unknown`);
        }
      }
    } catch (err: any) {
      console.warn(`[wpp-status] ${variant.label} error:`, err.message);
    }
  }

  return { connected: false };
}

// Start session
async function startSession(sessionName: string, webhookUrl: string, token: string | null): Promise<any> {
  console.info('[wpp-status] Starting session');

  const body = { webhook: webhookUrl, waitQrCode: true };
  const variants: any[] = [];

  if (token) {
    variants.push({ method: 'POST', url: `${BASE}/api/${sessionName}/start-session`, headers: { ...standardHeaders, Authorization: `Bearer ${token}` }, body, label: 'Start Bearer token' });
    variants.push({ method: 'POST', url: `${BASE}/api/${sessionName}/start-session/`, headers: { ...standardHeaders, Authorization: `Bearer ${token}` }, body, label: 'Start Bearer token (/)' });
  }
  variants.push({ method: 'POST', url: `${BASE}/api/${sessionName}/${SECRET}/start-session`, headers: standardHeaders, body, label: 'Start secret in path' });
  variants.push({ method: 'POST', url: `${BASE}/api/${sessionName}/${SECRET}/start-session/`, headers: standardHeaders, body, label: 'Start secret in path (/)' });
  variants.push({ method: 'POST', url: `${BASE}/api/${sessionName}/start-session?secretKey=${SECRET}`, headers: standardHeaders, body, label: 'Start secretKey query' });
  variants.push({ method: 'POST', url: `${BASE}/api/${sessionName}/start-session/?secretKey=${SECRET}`, headers: standardHeaders, body, label: 'Start secretKey query (/)' });
  variants.push({ method: 'POST', url: `${BASE}/api/${sessionName}/start-session?secretKey=${SECRET}&json=true`, headers: standardHeaders, body, label: 'Start secretKey+json' });

  for (const variant of variants) {
    try {
      const res = await withTimeout(
        fetch(variant.url, {
          method: variant.method,
          headers: variant.headers,
          body: JSON.stringify(variant.body),
        }),
        TIMEOUT
      );

      await logResponse(`[wpp-status] ${variant.label}`, res);

      if (res.ok) {
        const text = await res.text();
        if (text) {
          try {
            const data = JSON.parse(text);
            console.info(`[wpp-status] Session started via ${variant.label}`);
            return data;
          } catch {}
        }
        console.info(`[wpp-status] Start returned 200 (empty) via ${variant.label}`);
        return { started: true };
      }
    } catch (err: any) {
      console.warn(`[wpp-status] ${variant.label} error:`, err.message);
    }
  }

  throw new Error('Failed to start session with all variants');
}

// Poll for QR code (up to 60 seconds)
async function pollForQR(sessionName: string, token: string | null): Promise<string | null> {
  console.info('[wpp-status] Starting QR polling (max 60s)');

  const maxAttempts = 60;
  const delayMs = 1000;

  for (let i = 1; i <= maxAttempts; i++) {
    const variants: any[] = [];

    if (token) {
      variants.push({ method: 'GET', url: `${BASE}/api/${sessionName}/qrcode`, headers: { ...standardHeaders, Authorization: `Bearer ${token}` }, label: `QR poll #${i} Bearer token` });
    }
    variants.push({ method: 'GET', url: `${BASE}/api/${sessionName}/${SECRET}/qrcode`, headers: standardHeaders, label: `QR poll #${i} secret in path` });
    variants.push({ method: 'GET', url: `${BASE}/api/${sessionName}/${SECRET}/qrcode/`, headers: standardHeaders, label: `QR poll #${i} secret in path (/)` });
    variants.push({ method: 'GET', url: `${BASE}/api/${sessionName}/qrcode?secretKey=${SECRET}`, headers: standardHeaders, label: `QR poll #${i} secretKey query` });
    variants.push({ method: 'GET', url: `${BASE}/api/${sessionName}/qrcode/?secretKey=${SECRET}`, headers: standardHeaders, label: `QR poll #${i} secretKey query (/)` });
    variants.push({ method: 'GET', url: `${BASE}/api/${sessionName}/qrcode?secretKey=${SECRET}&json=true`, headers: standardHeaders, label: `QR poll #${i} secretKey+json` });
    variants.push({ method: 'GET', url: `${BASE}/api/${sessionName}/${SECRET}/qr-code`, headers: standardHeaders, label: `QR poll #${i} qr-code variant` });
    variants.push({ method: 'GET', url: `${BASE}/api/${sessionName}/${SECRET}/get-qr-code`, headers: standardHeaders, label: `QR poll #${i} get-qr-code variant` });

    for (const variant of variants) {
      try {
        const res = await withTimeout(fetch(variant.url, { method: variant.method, headers: variant.headers }), TIMEOUT);
        await logResponse(`[wpp-status] ${variant.label}`, res);

        if (res.ok) {
          const text = await res.text();
          if (text) {
            try {
              const data = JSON.parse(text);
              const qr = data?.qrcode || data?.qr || data?.base64 || data?.image || data?.data?.qrcode || data?.data?.qr || data?.result?.qrcode || data?.result?.qr;
              if (qr) {
                console.info(`[wpp-status] QR found via ${variant.label}`);
                return qr;
              }
            } catch {}
          }
        }
      } catch (err: any) {
        console.warn(`[wpp-status] ${variant.label} error:`, err.message);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  console.info('[wpp-status] QR polling completed without QR');
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.info('[wpp-status] Configuration: { BASE: "' + BASE + '", SECRET: "' + maskSecret(SECRET) + '" }');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[wpp-status] Missing Authorization header');
      throw new Error('Missing Authorization header');
    }
    console.info(`[wpp-status] Auth header present`);

    // Extract token from "Bearer <token>"
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      console.error('[wpp-status] Empty token after Bearer extraction');
      throw new Error('Invalid token format');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    });

    // Pass token explicitly to getUser
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('[wpp-status] auth.getUser failed:', authError?.message || 'no user');
      throw new Error('Authentication failed');
    }
    console.info(`[wpp-status] User authenticated: ${user.id}`);

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      throw new Error('Organization not found');
    }

    const sessionName = `org_${profile.organization_id}`;
    const webhookUrl = `${supabaseUrl}/functions/v1/wpp-webhook`;

    console.info('[wpp-status] Session: ' + sessionName);

    // Try to generate token
    const token = await generateToken(sessionName);

    // Check connection
    const statusData = await checkConnection(sessionName, token);
    if (statusData.connected) {
      console.info('[wpp-status] Final status: connected');
      return new Response(
        JSON.stringify({ ok: true, status: 'connected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for cached QR in DB
    const { data: cachedSession } = await supabase
      .from('whatsapp_sessions')
      .select('qr_code, updated_at')
      .eq('organization_id', profile.organization_id)
      .single();

    if (cachedSession?.qr_code) {
      const updatedAt = new Date(cachedSession.updated_at);
      const ageSeconds = (Date.now() - updatedAt.getTime()) / 1000;
      if (ageSeconds < 40) {
        console.info('[wpp-status] Using cached QR');
        return new Response(
          JSON.stringify({ ok: true, status: 'qr_issued', qrcode: cachedSession.qr_code }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Start session
    await startSession(sessionName, webhookUrl, token);

    // Poll for QR
    const qr = await pollForQR(sessionName, token);

    if (qr) {
      await supabase
        .from('whatsapp_sessions')
        .upsert({
          organization_id: profile.organization_id,
          session_name: sessionName,
          status: 'qr_issued',
          qr_code: qr,
          updated_at: new Date().toISOString(),
        });

      console.info('[wpp-status] Final status: qr_issued');
      return new Response(
        JSON.stringify({ ok: true, status: 'qr_issued', qrcode: qr }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No QR yet - return pending
    await supabase
      .from('whatsapp_sessions')
      .upsert({
        organization_id: profile.organization_id,
        session_name: sessionName,
        status: 'qr_pending',
        updated_at: new Date().toISOString(),
      });

    console.info('[wpp-status] Final status: qr_pending');
    return new Response(
      JSON.stringify({ ok: true, status: 'qr_pending', message: 'QR generation in progress, please wait...' }),
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
