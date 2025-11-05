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

async function generateToken(sessionName: string): Promise<string> {
  const url = `${BASE}/api/${sessionName}/${SECRET}/generate-token`;
  console.log('[wpp-status] POST', url.replace(SECRET, '***'));
  
  const res = await withTimeout(
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
  );

  console.log('[wpp-status] Token response:', res.status);
  
  if (!res.ok) {
    throw new Error(`generate-token failed: ${res.status}`);
  }
  
  const text = await res.text();
  console.log('[wpp-status] Token body:', text.substring(0, 200));
  
  if (!text?.trim()) {
    throw new Error('Empty response from generate-token');
  }
  
  const data = JSON.parse(text);
  if (!data?.token) {
    throw new Error('No token in response');
  }
  
  console.log('[wpp-status] ✓ Token obtained');
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

    console.log('[wpp-status] Session:', sessionName);

    // 1) Generate Bearer token
    const wppToken = await generateToken(sessionName);

    // 2) Check connection status
    console.log('[wpp-status] Checking connection');
    const statusUrl = `${BASE}/api/${sessionName}/status-session`;
    const statusRes = await withTimeout(
      fetch(statusUrl, {
        headers: { Authorization: `Bearer ${wppToken}` }
      })
    );

    console.log('[wpp-status] Status:', statusRes.status);
    
    let connected = false;
    if (statusRes.ok) {
      const statusText = await statusRes.text();
      console.log('[wpp-status] Status body:', statusText.substring(0, 300));
      
      if (statusText?.trim()) {
        const statusData = JSON.parse(statusText);
        connected = statusData?.status === 'CONNECTED' || statusData?.state === 'CONNECTED';
        console.log('[wpp-status] Connected:', connected);
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
          waitQrCode: true
        })
      })
    );

    console.log('[wpp-status] Start response:', startRes.status);
    
    let qrCode: string | null = null;
    if (startRes.ok) {
      const startText = await startRes.text();
      console.log('[wpp-status] Start body:', startText.substring(0, 300));
      
      if (startText?.trim()) {
        const startData = JSON.parse(startText);
        qrCode = startData?.qrcode || startData?.qr || null;
      }
    }

    // 5) Try qrcode endpoint if no QR yet
    if (!qrCode) {
      console.log('[wpp-status] Trying qrcode endpoint');
      const qrUrl = `${BASE}/api/${sessionName}/qrcode`;
      const qrRes = await withTimeout(
        fetch(qrUrl, {
          headers: { Authorization: `Bearer ${wppToken}` }
        })
      );

      console.log('[wpp-status] QR response:', qrRes.status);
      
      if (qrRes.ok) {
        const qrText = await qrRes.text();
        console.log('[wpp-status] QR body:', qrText.substring(0, 300));
        
        if (qrText?.trim()) {
          const qrData = JSON.parse(qrText);
          qrCode = qrData?.qrcode || qrData?.qr || null;
        }
      }
    }

    const status = qrCode ? 'qr_issued' : 'disconnected';
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
