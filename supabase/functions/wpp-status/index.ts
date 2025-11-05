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

// Generate WPP API token - simplified to 2 most reliable variants
async function generateToken(sessionName: string): Promise<string | null> {
  console.info(`[wpp-status] Attempting to generate token for: ${sessionName}`);

  const variants = [
    { method: 'POST', url: `${BASE}/api/${sessionName}/${SECRET}/generate-token`, label: 'POST secret in path' },
    { method: 'GET', url: `${BASE}/api/${sessionName}/${SECRET}/generate-token`, label: 'GET secret in path' },
  ];

  for (const variant of variants) {
    try {
      console.info(`[wpp-status] Try: ${variant.label}`);
      console.info(`[wpp-status] Request: ${variant.method} ${maskSensitiveData(variant.url)}`);
      
      const res = await withTimeout(
        fetch(variant.url, {
          method: variant.method,
          headers: standardHeaders,
        }),
        TIMEOUT
      );
      
      console.info(`[wpp-status] Response: ${res.status} ${res.statusText}`);
      console.info(`[wpp-status] Response Content-Type:`, res.headers.get('content-type'));
      console.info(`[wpp-status] Response Content-Length:`, res.headers.get('content-length'));
      
      if (res.ok) {
        const text = await res.text();
        if (text) {
          try {
            const data = JSON.parse(text);
            const token = data?.token || data?.access_token || data?.result?.token;
            if (token) {
              console.info(`[wpp-status] ✓ Token generated via ${variant.label}`);
              return token;
            }
          } catch (e) {
            console.warn(`[wpp-status] ${variant.label} non-JSON response:`, text.substring(0, 100));
          }
        }
      }
    } catch (err: any) {
      console.warn(`[wpp-status] ${variant.label} error:`, err.message);
    }
  }

  console.warn('[wpp-status] All token generation attempts failed - proceeding with secret fallbacks');
  return null;
}

// Check connection status - simplified with Bearer token
async function checkConnection(sessionName: string, wppToken: string | null): Promise<any> {
  console.info('[wpp-status] Checking connection');

  const variants: any[] = [];

  if (wppToken) {
    variants.push({ 
      method: 'GET', 
      url: `${BASE}/api/${sessionName}/status-session`, 
      headers: { ...standardHeaders, Authorization: `Bearer ${wppToken}` }, 
      label: 'Status with Bearer token' 
    });
  }
  
  variants.push({ 
    method: 'GET', 
    url: `${BASE}/api/${sessionName}/${SECRET}/status-session`, 
    headers: standardHeaders, 
    label: 'Status with secret in path' 
  });

  for (const variant of variants) {
    try {
      console.info(`[wpp-status] Request: ${variant.method} ${maskSensitiveData(variant.url)}`);
      console.info(`[wpp-status] Headers:`, Object.keys(variant.headers));
      
      const res = await withTimeout(fetch(variant.url, { method: variant.method, headers: variant.headers }), TIMEOUT);
      
      console.info(`[wpp-status] Response: ${res.status} ${res.statusText}`);
      console.info(`[wpp-status] Response Content-Type:`, res.headers.get('content-type'));
      
      if (res.ok) {
        const text = await res.text();
        if (text) {
          try {
            const data = JSON.parse(text);
            const connected = data?.connected || data?.result?.connected || data?.status === 'CONNECTED' || data?.state === 'CONNECTED';
            if (connected) {
              console.info(`[wpp-status] ✓ Connected via ${variant.label}`);
              return { connected: true };
            }
            return data;
          } catch (e) {
            console.warn(`[wpp-status] ${variant.label} non-JSON response:`, text.substring(0, 100));
          }
        } else {
          console.warn(`[wpp-status] Status returned 200 but empty body`);
        }
      }
    } catch (err: any) {
      console.warn(`[wpp-status] ${variant.label} error:`, err.message);
    }
  }

  return { connected: false };
}

// Start session - simplified with Bearer token
async function startSession(sessionName: string, webhookUrl: string, wppToken: string | null): Promise<any> {
  console.info('[wpp-status] Starting session');

  const body = { webhook: webhookUrl, waitQrCode: true };
  const variants: any[] = [];

  if (wppToken) {
    variants.push({ 
      method: 'POST', 
      url: `${BASE}/api/${sessionName}/start-session`, 
      headers: { ...standardHeaders, Authorization: `Bearer ${wppToken}` }, 
      body, 
      label: 'Start with Bearer token' 
    });
  }
  
  variants.push({ 
    method: 'POST', 
    url: `${BASE}/api/${sessionName}/${SECRET}/start-session`, 
    headers: standardHeaders, 
    body, 
    label: 'Start with secret in path' 
  });

  for (const variant of variants) {
    try {
      console.info(`[wpp-status] Request: ${variant.method} ${maskSensitiveData(variant.url)}`);
      console.info(`[wpp-status] Headers:`, Object.keys(variant.headers));
      
      const res = await withTimeout(
        fetch(variant.url, {
          method: variant.method,
          headers: variant.headers,
          body: JSON.stringify(variant.body),
        }),
        TIMEOUT
      );

      console.info(`[wpp-status] Response: ${res.status} ${res.statusText}`);
      console.info(`[wpp-status] Response Content-Type:`, res.headers.get('content-type'));

      if (res.ok) {
        const text = await res.text();
        if (text) {
          try {
            const data = JSON.parse(text);
            console.info(`[wpp-status] ✓ Session started via ${variant.label}`);
            return data;
          } catch (e) {
            console.warn(`[wpp-status] ${variant.label} non-JSON response:`, text.substring(0, 100));
          }
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

// Poll for QR code with proper Content-Type handling
async function pollForQR(sessionName: string, wppToken: string | null): Promise<string | null> {
  console.info('[wpp-status] Starting QR polling (max 60s)');

  const maxAttempts = 60;
  const delayMs = 1000;

  for (let i = 1; i <= maxAttempts; i++) {
    const variants: any[] = [];

    if (wppToken) {
      variants.push({ 
        method: 'GET', 
        url: `${BASE}/api/${sessionName}/qrcode`, 
        headers: { ...standardHeadersAny, Authorization: `Bearer ${wppToken}` }, 
        label: `QR #${i} Bearer` 
      });
    }
    
    variants.push({ 
      method: 'GET', 
      url: `${BASE}/api/${sessionName}/${SECRET}/qrcode`, 
      headers: standardHeadersAny, 
      label: `QR #${i} secret` 
    });

    for (const variant of variants) {
      try {
        const res = await withTimeout(fetch(variant.url, { method: variant.method, headers: variant.headers }), TIMEOUT);
        
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          console.info(`[wpp-status] ${variant.label} Content-Type: ${contentType}`);

          // 1. Raw PNG/JPEG image
          if (contentType.includes('image/')) {
            console.info(`[wpp-status] ${variant.label} detected raw image`);
            const buffer = await res.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
            const qr = `data:${contentType};base64,${base64}`;
            console.info(`[wpp-status] ✓ QR found as raw image via ${variant.label}`);
            return qr;
          }

          // 2. Text response (data URI or JSON)
          const text = await res.text();
          if (!text) continue;

          // 2a. Data URI directly
          if (text.startsWith('data:image/')) {
            console.info(`[wpp-status] ✓ QR found as data URI via ${variant.label}`);
            return text;
          }

          // 2b. JSON wrapper
          try {
            const data = JSON.parse(text);
            const qr = data?.qrcode || data?.qr || data?.base64 || data?.image;
            if (qr) {
              console.info(`[wpp-status] ✓ QR found in JSON via ${variant.label}`);
              return qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`;
            }
          } catch (e) {
            console.warn(`[wpp-status] ${variant.label} non-JSON response (first 100 chars):`, text.substring(0, 100));
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
    console.info(`[wpp-status] Auth header present, length: ${authHeader.length}`);

    // Extract JWT token from "Bearer <token>"
    const jwtToken = authHeader.replace('Bearer ', '').trim();
    if (!jwtToken) {
      console.error('[wpp-status] Empty token after Bearer extraction');
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
      console.error('[wpp-status] auth.getUser failed:', authError?.message || 'no user, will attempt JWT decode');
      try {
        const payload = JSON.parse(atob(jwtToken.split('.')[1] || ''));
        userId = payload?.sub || null;
        console.info('[wpp-status] Fallback JWT decode succeeded');
      } catch (e) {
        console.error('[wpp-status] Fallback JWT decode failed');
        throw new Error('Authentication failed');
      }
    }
    console.info(`[wpp-status] User authenticated: ${userId}`);

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (!profile?.organization_id) {
      throw new Error('Organization not found');
    }

    const sessionName = `org_${profile.organization_id}`;
    const webhookUrl = `${supabaseUrl}/functions/v1/wpp-webhook`;

    console.info('[wpp-status] Session: ' + sessionName);

    // Try to generate WPP API token
    const wppToken = await generateToken(sessionName);

    // Check connection
    const statusData = await checkConnection(sessionName, wppToken);
    if (statusData.connected) {
      console.info('[wpp-status] Final status: connected');
      return new Response(
        JSON.stringify({ ok: true, status: 'connected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for cached QR in DB
    const { data: cachedSession, error: cacheError } = await supabase
      .from('whatsapp_sessions')
      .select('last_qr_b64, last_qr_at, updated_at')
      .eq('organization_id', profile.organization_id)
      .single();

    if (cacheError) {
      console.warn('[wpp-status] Error reading cached QR:', cacheError.message);
    }

    if (cachedSession?.last_qr_b64 && cachedSession?.last_qr_at) {
      const qrGeneratedAt = new Date(cachedSession.last_qr_at);
      const ageSeconds = (Date.now() - qrGeneratedAt.getTime()) / 1000;
      if (ageSeconds < 40) {
        console.info('[wpp-status] Using cached QR (age: ' + ageSeconds.toFixed(1) + 's)');
        return new Response(
          JSON.stringify({ ok: true, status: 'qr_issued', qrcode: cachedSession.last_qr_b64 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Start session
    await startSession(sessionName, webhookUrl, wppToken);

    // Poll for QR
    const qr = await pollForQR(sessionName, wppToken);

    if (qr) {
      const { error: upsertError } = await supabase
        .from('whatsapp_sessions')
        .upsert({
          organization_id: profile.organization_id,
          session_name: sessionName,
          status: 'qr_issued',
          last_qr_b64: qr,
          last_qr_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (upsertError) {
        console.error('[wpp-status] Error saving QR to DB:', upsertError.message);
      }

      console.info('[wpp-status] Final status: qr_issued');
      return new Response(
        JSON.stringify({ ok: true, status: 'qr_issued', qrcode: qr }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No QR yet - return pending
    const { error: pendingError } = await supabase
      .from('whatsapp_sessions')
      .upsert({
        organization_id: profile.organization_id,
        session_name: sessionName,
        status: 'qr_pending',
        updated_at: new Date().toISOString(),
      });

    if (pendingError) {
      console.error('[wpp-status] Error updating status to qr_pending:', pendingError.message);
    }

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
