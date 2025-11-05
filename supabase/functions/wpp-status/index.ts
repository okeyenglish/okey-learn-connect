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
  console.log('[wpp-status] Attempting to generate token for:', sessionName);
  
  // Try 1: POST with secret in path
  try {
    const url1 = `${BASE}/api/${sessionName}/${SECRET}/generate-token`;
    console.log('[wpp-status] Try 1: POST with secret in path');
    
    const res1 = await withTimeout(
      fetch(url1, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    );

    console.log('[wpp-status] Try 1 status:', res1.status);
    
    if (res1.ok) {
      const text1 = await res1.text();
      console.log('[wpp-status] Try 1 body:', text1.substring(0, 200));
      
      if (text1?.trim()) {
        const data1 = JSON.parse(text1);
        if (data1?.token) {
          console.log('[wpp-status] ✓ Token from Try 1');
          return data1.token;
        }
      }
    }
  } catch (err) {
    console.error('[wpp-status] Try 1 failed:', err);
  }

  // Try 2: POST with secretKey in body
  try {
    const url2 = `${BASE}/api/${sessionName}/generate-token`;
    console.log('[wpp-status] Try 2: POST with secretKey in body');
    
    const res2 = await withTimeout(
      fetch(url2, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey: SECRET })
      })
    );

    console.log('[wpp-status] Try 2 status:', res2.status);
    
    if (res2.ok) {
      const text2 = await res2.text();
      console.log('[wpp-status] Try 2 body:', text2.substring(0, 200));
      
      if (text2?.trim()) {
        const data2 = JSON.parse(text2);
        if (data2?.token) {
          console.log('[wpp-status] ✓ Token from Try 2');
          return data2.token;
        }
      }
    }
  } catch (err) {
    console.error('[wpp-status] Try 2 failed:', err);
  }

  // Try 3: GET with secret in path
  try {
    const url3 = `${BASE}/api/${sessionName}/${SECRET}/generate-token`;
    console.log('[wpp-status] Try 3: GET with secret in path');
    
    const res3 = await withTimeout(fetch(url3));

    console.log('[wpp-status] Try 3 status:', res3.status);
    
    if (res3.ok) {
      const text3 = await res3.text();
      console.log('[wpp-status] Try 3 body:', text3.substring(0, 200));
      
      if (text3?.trim()) {
        const data3 = JSON.parse(text3);
        if (data3?.token) {
          console.log('[wpp-status] ✓ Token from Try 3');
          return data3.token;
        }
      }
    }
  } catch (err) {
    console.error('[wpp-status] Try 3 failed:', err);
  }

  // Try 4: GET with secretKey query param
  try {
    const url4 = `${BASE}/api/${sessionName}/generate-token?secretKey=${encodeURIComponent(SECRET)}`;
    console.log('[wpp-status] Try 4: GET with secretKey query');
    
    const res4 = await withTimeout(fetch(url4));

    console.log('[wpp-status] Try 4 status:', res4.status);
    
    if (res4.ok) {
      const text4 = await res4.text();
      console.log('[wpp-status] Try 4 body:', text4.substring(0, 200));
      
      if (text4?.trim()) {
        const data4 = JSON.parse(text4);
        if (data4?.token) {
          console.log('[wpp-status] ✓ Token from Try 4');
          return data4.token;
        }
      }
    }
  } catch (err) {
    console.error('[wpp-status] Try 4 failed:', err);
  }

  throw new Error('All token generation attempts failed - server returns empty responses');
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
