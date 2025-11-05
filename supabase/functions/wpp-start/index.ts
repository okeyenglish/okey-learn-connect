import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE = Deno.env.get('WPP_BASE_URL') || 'https://msg.academyos.ru';
const SECRET = Deno.env.get('WPP_SECRET') || '';
const TIMEOUT = 30000;

console.log('[wpp-start] Configuration:', {
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

async function generateToken(sessionName: string): Promise<string> {
  const url = `${BASE}/api/${sessionName}/${SECRET}/generate-token`;
  console.log('[wpp-start] POST', url.replace(SECRET, '***'));
  
  const res = await withTimeout(
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
  );

  console.log('[wpp-start] Token response:', res.status);
  
  if (!res.ok) {
    throw new Error(`generate-token failed: ${res.status}`);
  }
  
  const text = await res.text();
  console.log('[wpp-start] Token body:', text.substring(0, 200));
  
  if (!text?.trim()) {
    throw new Error('Empty response from generate-token');
  }
  
  const data = JSON.parse(text);
  if (!data?.token) {
    throw new Error('No token in response');
  }
  
  console.log('[wpp-start] ✓ Token obtained');
  return data.token;
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

    console.log('[wpp-start] Session:', sessionName);

    // Generate Bearer token
    const wppToken = await generateToken(sessionName);

    // Start session
    console.log('[wpp-start] Starting session');
    const startUrl = `${BASE}/api/${sessionName}/start-session`;
    const startRes = await withTimeout(
      fetch(startUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${wppToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          webhook: webhookUrl,
          waitQrCode: true,
          useChrome: true,
          headless: true,
          browserArgs: ['--no-sandbox', '--disable-dev-shm-usage']
        })
      })
    );

    console.log('[wpp-start] Start response:', startRes.status);
    
    if (!startRes.ok) {
      const errorText = await startRes.text();
      console.error('[wpp-start] Start failed:', errorText.substring(0, 200));
      throw new Error(`Failed to start session: ${startRes.status}`);
    }

    const startText = await startRes.text();
    console.log('[wpp-start] Start body:', startText.substring(0, 300));
    
    let qrCode: string | null = null;
    let status = 'disconnected';
    
    if (startText?.trim()) {
      const startData = JSON.parse(startText);
      qrCode = startData?.qrcode || startData?.qr || null;
      
      const isConnected = startData?.status === 'CONNECTED' || startData?.state === 'CONNECTED';
      status = isConnected ? 'connected' : (qrCode ? 'qr_issued' : 'disconnected');
    }

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
    console.error('[wpp-start] Error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
