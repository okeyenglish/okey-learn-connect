import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE = Deno.env.get('WPP_BASE_URL') || 'https://msg.academyos.ru';
const SECRET = Deno.env.get('WPP_SECRET') || '';
const TIMEOUT = 30000;

console.log('[wpp-status] Configuration:', {
  BASE,
  SECRET: SECRET ? `${SECRET.substring(0, 4)}***${SECRET.slice(-4)}` : 'MISSING'
});

function maskSecret(s?: string) {
  if (!s || s.length < 8) return '***';
  return `${s.substring(0, 4)}***${s.slice(-4)}`;
}

async function withTimeout<T>(promise: Promise<T>, ms = TIMEOUT): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    )
  ]);
}

const standardHeaders = {
  'Accept': 'application/json',
  'User-Agent': 'SupabaseEdge/1.0',
  'Cache-Control': 'no-cache',
};

function logResponse(label: string, res: Response, body: string) {
  console.log(`[wpp-status] ${label}:`, {
    url: res.url,
    status: res.status,
    redirected: res.redirected,
    contentType: res.headers.get('Content-Type'),
    contentLength: res.headers.get('Content-Length'),
    location: res.headers.get('Location'),
    bodyPreview: body.substring(0, 300),
  });
}

async function generateToken(sessionName: string): Promise<string | null> {
  console.log('[wpp-status] Attempting to generate token for:', sessionName);
  
  const variants = [
    { url: `${BASE}/api/${sessionName}/${SECRET}/generate-token`, method: 'POST', desc: 'POST secret in path' },
    { url: `${BASE}/api/${sessionName}/${SECRET}/generate-token/`, method: 'POST', desc: 'POST secret in path (trailing /)' },
    { url: `${BASE}/api/${sessionName}/generate-token`, method: 'POST', body: { secretKey: SECRET }, desc: 'POST secretKey in body' },
    { url: `${BASE}/api/${sessionName}/generate-token/`, method: 'POST', body: { secretKey: SECRET }, desc: 'POST secretKey in body (trailing /)' },
    { url: `${BASE}/api/${sessionName}/${SECRET}/generate-token`, method: 'GET', desc: 'GET secret in path' },
    { url: `${BASE}/api/${sessionName}/${SECRET}/generate-token/`, method: 'GET', desc: 'GET secret in path (trailing /)' },
    { url: `${BASE}/api/${sessionName}/generate-token?secretKey=${encodeURIComponent(SECRET)}`, method: 'GET', desc: 'GET secretKey query' },
    { url: `${BASE}/api/${sessionName}/generate-token/?secretKey=${encodeURIComponent(SECRET)}`, method: 'GET', desc: 'GET secretKey query (trailing /)' },
  ];

  for (const variant of variants) {
    try {
      console.log(`[wpp-status] Try: ${variant.desc}`);
      
      const opts: RequestInit = {
        method: variant.method,
        headers: { ...standardHeaders },
      };
      
      if (variant.method === 'POST') {
        opts.headers = { ...opts.headers, 'Content-Type': 'application/json' };
        if (variant.body) {
          opts.body = JSON.stringify(variant.body);
        }
      }
      
      const res = await withTimeout(fetch(variant.url, opts));
      const text = await res.text();
      logResponse(variant.desc, res, text);
      
      if (res.ok && text?.trim()) {
        try {
          const data = JSON.parse(text);
          if (data?.token) {
            console.log(`[wpp-status] ✓ Token from: ${variant.desc}`);
            return data.token;
          }
        } catch (parseErr) {
          console.warn(`[wpp-status] Parse error for ${variant.desc}:`, parseErr);
        }
      }
    } catch (err) {
      console.error(`[wpp-status] ${variant.desc} failed:`, err);
    }
  }

  console.warn('[wpp-status] All token generation attempts failed - proceeding with secret fallbacks');
  return null;
}

async function pollForQR(sessionName: string, wppToken: string | null, maxAttempts = 12, delayMs = 1000): Promise<string | null> {
  console.log('[wpp-status] Starting QR polling (max 12s)');
  
  for (let i = 0; i < maxAttempts; i++) {
    const variants = wppToken 
      ? [
          { url: `${BASE}/api/${sessionName}/qrcode`, headers: { ...standardHeaders, Authorization: `Bearer ${wppToken}` }, desc: 'Bearer token' },
          { url: `${BASE}/api/${sessionName}/qrcode/`, headers: { ...standardHeaders, Authorization: `Bearer ${wppToken}` }, desc: 'Bearer token (/)' },
        ]
      : [
          { url: `${BASE}/api/${sessionName}/${SECRET}/qrcode`, headers: standardHeaders, desc: 'secret in path' },
          { url: `${BASE}/api/${sessionName}/${SECRET}/qrcode/`, headers: standardHeaders, desc: 'secret in path (/)' },
          { url: `${BASE}/api/${sessionName}/qrcode?secretKey=${encodeURIComponent(SECRET)}`, headers: standardHeaders, desc: 'secretKey query' },
          { url: `${BASE}/api/${sessionName}/qrcode/?secretKey=${encodeURIComponent(SECRET)}`, headers: standardHeaders, desc: 'secretKey query (/)' },
        ];

    for (const variant of variants) {
      try {
        const res = await withTimeout(fetch(variant.url, { headers: variant.headers }));
        const text = await res.text();
        logResponse(`QR poll #${i + 1} ${variant.desc}`, res, text);
        
        if (res.ok && text?.trim()) {
          try {
            const data = JSON.parse(text);
            const qr = data?.qrcode || data?.qr;
            if (qr) {
              console.log(`[wpp-status] ✓ QR found on attempt ${i + 1}`);
              return qr;
            }
          } catch (parseErr) {
            console.warn(`[wpp-status] QR parse error:`, parseErr);
          }
        }
      } catch (err) {
        console.warn(`[wpp-status] QR poll #${i + 1} ${variant.desc} error:`, err);
      }
    }
    
    if (i < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  console.log('[wpp-status] QR polling completed without QR');
  return null;
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
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
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

    const orgId = profile.organization_id;
    const sessionName = `org_${orgId}`;
    const PUBLIC_URL = Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '');
    const webhookUrl = `${PUBLIC_URL}/functions/v1/wpp-webhook`;

    console.log('[wpp-status] Session:', sessionName);

    // 1) Generate Bearer token (with graceful fallback)
    let wppToken: string | null = null;
    try {
      wppToken = await generateToken(sessionName);
    } catch (e) {
      console.warn('[wpp-status] Token generation failed, using secret fallbacks:', (e as Error)?.message || e);
    }

    // 2) Check connection status
    console.log('[wpp-status] Checking connection');
    
    const statusVariants = wppToken
      ? [
          { url: `${BASE}/api/${sessionName}/status-session`, headers: { ...standardHeaders, Authorization: `Bearer ${wppToken}` }, desc: 'Bearer' },
          { url: `${BASE}/api/${sessionName}/status-session/`, headers: { ...standardHeaders, Authorization: `Bearer ${wppToken}` }, desc: 'Bearer (/)' },
        ]
      : [
          { url: `${BASE}/api/${sessionName}/${SECRET}/status-session`, headers: standardHeaders, desc: 'secret in path' },
          { url: `${BASE}/api/${sessionName}/${SECRET}/status-session/`, headers: standardHeaders, desc: 'secret in path (/)' },
          { url: `${BASE}/api/${sessionName}/status-session?secretKey=${encodeURIComponent(SECRET)}`, headers: standardHeaders, desc: 'secretKey query' },
          { url: `${BASE}/api/${sessionName}/status-session/?secretKey=${encodeURIComponent(SECRET)}`, headers: standardHeaders, desc: 'secretKey query (/)' },
        ];

    let connected = false;
    let statusFound = false;
    
    for (const variant of statusVariants) {
      try {
        const res = await withTimeout(fetch(variant.url, { headers: variant.headers }));
        const text = await res.text();
        logResponse(`Status ${variant.desc}`, res, text);
        
        if (res.ok && text?.trim()) {
          try {
            const data = JSON.parse(text);
            connected = data?.status === 'CONNECTED' || data?.state === 'CONNECTED';
            statusFound = true;
            console.log('[wpp-status] Connected:', connected);
            break;
          } catch (parseErr) {
            console.warn('[wpp-status] Status parse error:', parseErr);
          }
        } else if (res.ok && !text?.trim()) {
          console.warn('[wpp-status] Status returned 200 but empty body - treating as unknown');
        }
      } catch (err) {
        console.warn(`[wpp-status] Status ${variant.desc} error:`, err);
      }
    }

    if (connected) {
      await supabaseClient
        .from('whatsapp_sessions')
        .upsert({
          organization_id: orgId,
          session_name: sessionName,
          status: 'connected',
          last_qr_b64: null,
          last_qr_at: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'organization_id' });

      return new Response(
        JSON.stringify({ ok: true, status: 'connected', qrcode: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3) Not connected - check for recent QR in DB
    const { data: existingSession } = await supabaseClient
      .from('whatsapp_sessions')
      .select('last_qr_b64, last_qr_at')
      .eq('organization_id', orgId)
      .maybeSingle();

    if (existingSession?.last_qr_b64 && existingSession?.last_qr_at) {
      const qrAge = Date.now() - new Date(existingSession.last_qr_at).getTime();
      if (qrAge < 40000) {
        console.log('[wpp-status] Using cached QR');
        return new Response(
          JSON.stringify({ ok: true, status: 'qr_issued', qrcode: existingSession.last_qr_b64 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 4) Start session to get new QR
    console.log('[wpp-status] Starting session');
    
    const startVariants = wppToken
      ? [
          { 
            url: `${BASE}/api/${sessionName}/start-session`, 
            headers: { ...standardHeaders, Authorization: `Bearer ${wppToken}`, 'Content-Type': 'application/json' },
            body: { webhook: webhookUrl, waitQrCode: true },
            desc: 'Bearer'
          },
          { 
            url: `${BASE}/api/${sessionName}/start-session/`, 
            headers: { ...standardHeaders, Authorization: `Bearer ${wppToken}`, 'Content-Type': 'application/json' },
            body: { webhook: webhookUrl, waitQrCode: true },
            desc: 'Bearer (/)'
          },
        ]
      : [
          { 
            url: `${BASE}/api/${sessionName}/${SECRET}/start-session`,
            headers: { ...standardHeaders, 'Content-Type': 'application/json' },
            body: { webhook: webhookUrl, waitQrCode: true },
            desc: 'secret in path'
          },
          { 
            url: `${BASE}/api/${sessionName}/${SECRET}/start-session/`,
            headers: { ...standardHeaders, 'Content-Type': 'application/json' },
            body: { webhook: webhookUrl, waitQrCode: true },
            desc: 'secret in path (/)'
          },
          { 
            url: `${BASE}/api/${sessionName}/start-session`,
            headers: { ...standardHeaders, 'Content-Type': 'application/json' },
            body: { webhook: webhookUrl, waitQrCode: true, secretKey: SECRET },
            desc: 'secretKey in body'
          },
          { 
            url: `${BASE}/api/${sessionName}/start-session/`,
            headers: { ...standardHeaders, 'Content-Type': 'application/json' },
            body: { webhook: webhookUrl, waitQrCode: true, secretKey: SECRET },
            desc: 'secretKey in body (/)'
          },
        ];

    let sessionStarted = false;
    let qrCode: string | null = null;
    
    for (const variant of startVariants) {
      try {
        const res = await withTimeout(
          fetch(variant.url, {
            method: 'POST',
            headers: variant.headers,
            body: JSON.stringify(variant.body)
          })
        );
        
        const text = await res.text();
        logResponse(`Start ${variant.desc}`, res, text);
        
        if (res.ok) {
          sessionStarted = true;
          if (text?.trim()) {
            try {
              const data = JSON.parse(text);
              qrCode = data?.qrcode || data?.qr || null;
              if (qrCode) {
                console.log('[wpp-status] ✓ QR from start-session');
                break;
              }
            } catch (parseErr) {
              console.warn('[wpp-status] Start parse error:', parseErr);
            }
          }
          break; // Session started successfully, even if no QR yet
        }
      } catch (err) {
        console.warn(`[wpp-status] Start ${variant.desc} error:`, err);
      }
    }

    // 5) Poll for QR code if session started but no QR yet
    if (sessionStarted && !qrCode) {
      qrCode = await pollForQR(sessionName, wppToken);
    }

    const status = qrCode ? 'qr_issued' : (sessionStarted ? 'qr_pending' : 'disconnected');
    console.log('[wpp-status] Final status:', status);

    await supabaseClient
      .from('whatsapp_sessions')
      .upsert({
        organization_id: orgId,
        session_name: sessionName,
        status,
        last_qr_b64: qrCode,
        last_qr_at: qrCode ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id' });

    return new Response(
      JSON.stringify({ ok: true, status, qrcode: qrCode }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[wpp-status] Error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
