import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Utilities
const BASE = Deno.env.get('WPP_BASE_URL') || 'https://msg.academyos.ru';
const SECRET = Deno.env.get('WPP_SECRET')!;
const TIMEOUT = Number(Deno.env.get('WPP_TIMEOUT_MS') || '120000');

function maskSecret(s?: string) {
  if (!s) return '';
  if (s.length <= 8) return '***';
  return s.slice(0, 4) + '***' + s.slice(-4);
}

function withTimeout<T>(p: Promise<T>, ms = TIMEOUT) {
  return Promise.race([
    p,
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`timeout ${ms}ms`)), ms)),
  ]);
}

async function http(
  url: string,
  init: RequestInit = {},
  opts?: { expectJson?: boolean; redact?: string[] }
) {
  const start = Date.now();
  const expectJson = opts?.expectJson ?? true;
  const redact = opts?.redact ?? [];

  const req = new Request(url, init);
  const res = await withTimeout(fetch(req));
  const ct = res.headers.get('content-type') || '';
  const text = await res.text();

  const logUrl = redact.reduce((u, r) => u.replaceAll(r, '***'), url);
  console.log(
    `[wpp:http] ${req.method || 'GET'} ${logUrl} -> ${res.status} ${ct} ` +
      `(${Date.now() - start}ms) body[${text.length}]`
  );

  if (!res.ok) {
    return { ok: false, status: res.status, headers: res.headers, bodyText: text };
  }

  if (expectJson && ct.includes('application/json')) {
    try {
      return { ok: true, status: res.status, headers: res.headers, json: JSON.parse(text) };
    } catch {
      return { ok: true, status: res.status, headers: res.headers, bodyText: text };
    }
  }
  return { ok: true, status: res.status, headers: res.headers, bodyText: text };
}

async function getBearerToken(session: string): Promise<string | null> {
  // 1) POST with body
  {
    const r = await http(
      `${BASE}/api/${encodeURIComponent(session)}/generate-token`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ secretKey: SECRET }),
      },
      { expectJson: true, redact: [SECRET] }
    );
    if (r.ok) {
      if ((r as any).json?.token) return (r as any).json.token as string;
      if ((r as any).bodyText && (r as any).bodyText.trim().length > 0) {
        return (r as any).bodyText.trim();
      }
    }
  }
  // 2) GET with query
  {
    const r = await http(
      `${BASE}/api/${encodeURIComponent(session)}/generate-token?secretKey=${encodeURIComponent(SECRET)}`,
      { method: 'GET' },
      { expectJson: true, redact: [SECRET] }
    );
    if (r.ok) {
      if ((r as any).json?.token) return (r as any).json.token as string;
      if ((r as any).bodyText && (r as any).bodyText.trim().length > 0) {
        return (r as any).bodyText.trim();
      }
    }
  }
  // 3) Path variant
  {
    const r = await http(
      `${BASE}/api/${encodeURIComponent(session)}/${encodeURIComponent(SECRET)}/generate-token`,
      { method: 'POST' },
      { expectJson: true, redact: [SECRET] }
    );
    if (r.ok) {
      if ((r as any).json?.token) return (r as any).json.token as string;
      if ((r as any).bodyText && (r as any).bodyText.trim().length > 0) {
        return (r as any).bodyText.trim();
      }
    }
  }

  return null;
}

async function startViaBearer(session: string, token: string, body: unknown) {
  return http(
    `${BASE}/api/${encodeURIComponent(session)}/start-session`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
    { expectJson: true }
  );
}

async function startViaSecretPath(session: string, body: unknown) {
  return http(
    `${BASE}/api/${encodeURIComponent(session)}/${encodeURIComponent(SECRET)}/start-session`,
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) },
    { expectJson: true, redact: [SECRET] }
  );
}

function normalizeStatus(payload: any) {
  const s = (payload?.status || payload?.state || '').toString().toUpperCase();
  const connected =
    payload?.isConnected === true ||
    s === 'CONNECTED' ||
    s === 'OPEN' ||
    s === 'READY';
  return {
    raw: payload,
    status: s || (connected ? 'CONNECTED' : 'UNKNOWN'),
    isConnected: connected,
    qrcode: payload?.qrcode || payload?.qr || null,
  };
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
    const PUBLIC_URL = Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '');
    const webhookUrl = `${PUBLIC_URL}/functions/v1/wpp-webhook?session=${sessionName}&secret=${SECRET}`;

    console.log(`[wpp-start] Starting session=${sessionName}, secret=${maskSecret(SECRET)}`);

    const startBody = {
      webhook: { enabled: true, url: webhookUrl, secret: SECRET },
      waitQrCode: true,
      useChrome: true,
      headless: true,
      browserArgs: ['--no-sandbox', '--disable-dev-shm-usage', '--no-first-run', '--no-zygote'],
    };

    // 1) Try Bearer
    let wppToken = await getBearerToken(sessionName);
    if (wppToken) {
      console.log(`[wpp-start] Attempting bearer auth for ${sessionName}`);
      const r = await startViaBearer(sessionName, wppToken, startBody);
      if (r.ok) {
        console.log(`[wpp-start] bearer OK session=${sessionName}`);
        const norm = normalizeStatus((r as any).json ?? (r as any).bodyText);
        
        await supabaseClient
          .from('whatsapp_sessions')
          .upsert({
            organization_id: organizationId,
            session_name: sessionName,
            status: norm.isConnected ? 'connected' : (norm.qrcode ? 'qr_issued' : 'disconnected'),
            last_qr_b64: norm.qrcode,
            last_qr_at: norm.qrcode ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'organization_id' });

        return Response.json({ 
          ok: true, 
          method: 'bearer', 
          session: sessionName,
          status: norm.isConnected ? 'connected' : (norm.qrcode ? 'qr_issued' : 'disconnected'),
          qrcode: norm.qrcode,
          organizationId 
        }, { headers: corsHeaders });
      }
      console.warn(`[wpp-start] bearer FAIL ${sessionName}, fallback to secret-path`);
    } else {
      console.warn(`[wpp-start] no token from generate-token (empty body); fallback secret-path`);
    }

    // 2) Fallback: secret in path
    console.log(`[wpp-start] Using secret-path auth for ${sessionName}`);
    const r2 = await startViaSecretPath(sessionName, startBody);
    if (r2.ok) {
      console.log(`[wpp-start] secret-path OK session=${sessionName}`);
      const norm = normalizeStatus((r2 as any).json ?? (r2 as any).bodyText);
      
      await supabaseClient
        .from('whatsapp_sessions')
        .upsert({
          organization_id: organizationId,
          session_name: sessionName,
          status: norm.isConnected ? 'connected' : (norm.qrcode ? 'qr_issued' : 'disconnected'),
          last_qr_b64: norm.qrcode,
          last_qr_at: norm.qrcode ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'organization_id' });

      return Response.json({ 
        ok: true, 
        method: 'secret-path', 
        session: sessionName,
        status: norm.isConnected ? 'connected' : (norm.qrcode ? 'qr_issued' : 'disconnected'),
        qrcode: norm.qrcode,
        organizationId 
      }, { headers: corsHeaders });
    }

    return Response.json(
      {
        ok: false,
        error: 'start failed',
        detail: {
          bearerTried: !!wppToken,
          bearerStatus: wppToken ? (r2 as any).status : undefined,
        },
      },
      { status: 502, headers: corsHeaders }
    );
  } catch (e) {
    console.error('[wpp-start] error:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
