import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE = Deno.env.get('WPP_BASE_URL') || 'https://msg.academyos.ru';
const SECRET = Deno.env.get('WPP_SECRET') || '';
const TIMEOUT = 30000;

console.log('[wpp-disconnect] Configuration:', {
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
  console.log('[wpp-disconnect] Attempting to generate token for:', sessionName);
  
  // Try 1: POST with secret in path
  try {
    const url1 = `${BASE}/api/${sessionName}/${SECRET}/generate-token`;
    console.log('[wpp-disconnect] Try 1: POST with secret in path');
    
    const res1 = await withTimeout(
      fetch(url1, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    );

    console.log('[wpp-disconnect] Try 1 status:', res1.status);
    
    if (res1.ok) {
      const text1 = await res1.text();
      console.log('[wpp-disconnect] Try 1 body:', text1.substring(0, 200));
      
      if (text1?.trim()) {
        const data1 = JSON.parse(text1);
        if (data1?.token) {
          console.log('[wpp-disconnect] ✓ Token from Try 1');
          return data1.token;
        }
      }
    }
  } catch (err) {
    console.error('[wpp-disconnect] Try 1 failed:', err);
  }

  // Try 2: POST with secretKey in body
  try {
    const url2 = `${BASE}/api/${sessionName}/generate-token`;
    console.log('[wpp-disconnect] Try 2: POST with secretKey in body');
    
    const res2 = await withTimeout(
      fetch(url2, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey: SECRET })
      })
    );

    console.log('[wpp-disconnect] Try 2 status:', res2.status);
    
    if (res2.ok) {
      const text2 = await res2.text();
      console.log('[wpp-disconnect] Try 2 body:', text2.substring(0, 200));
      
      if (text2?.trim()) {
        const data2 = JSON.parse(text2);
        if (data2?.token) {
          console.log('[wpp-disconnect] ✓ Token from Try 2');
          return data2.token;
        }
      }
    }
  } catch (err) {
    console.error('[wpp-disconnect] Try 2 failed:', err);
  }

  // Try 3: GET with secret in path
  try {
    const url3 = `${BASE}/api/${sessionName}/${SECRET}/generate-token`;
    console.log('[wpp-disconnect] Try 3: GET with secret in path');
    
    const res3 = await withTimeout(fetch(url3));

    console.log('[wpp-disconnect] Try 3 status:', res3.status);
    
    if (res3.ok) {
      const text3 = await res3.text();
      console.log('[wpp-disconnect] Try 3 body:', text3.substring(0, 200));
      
      if (text3?.trim()) {
        const data3 = JSON.parse(text3);
        if (data3?.token) {
          console.log('[wpp-disconnect] ✓ Token from Try 3');
          return data3.token;
        }
      }
    }
  } catch (err) {
    console.error('[wpp-disconnect] Try 3 failed:', err);
  }

  // Try 4: GET with secretKey query param
  try {
    const url4 = `${BASE}/api/${sessionName}/generate-token?secretKey=${encodeURIComponent(SECRET)}`;
    console.log('[wpp-disconnect] Try 4: GET with secretKey query');
    
    const res4 = await withTimeout(fetch(url4));

    console.log('[wpp-disconnect] Try 4 status:', res4.status);
    
    if (res4.ok) {
      const text4 = await res4.text();
      console.log('[wpp-disconnect] Try 4 body:', text4.substring(0, 200));
      
      if (text4?.trim()) {
        const data4 = JSON.parse(text4);
        if (data4?.token) {
          console.log('[wpp-disconnect] ✓ Token from Try 4');
          return data4.token;
        }
      }
    }
  } catch (err) {
    console.error('[wpp-disconnect] Try 4 failed:', err);
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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Organization not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orgId = profile.organization_id;
    const sessionName = `org_${orgId}`;
    console.log('[wpp-disconnect] Session:', sessionName);

    // Generate Bearer token
    const wppToken = await generateToken(sessionName);

    // Logout session
    console.log('[wpp-disconnect] Logging out');
    const logoutUrl = `${BASE}/api/${sessionName}/logout-session`;
    const logoutRes = await withTimeout(
      fetch(logoutUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${wppToken}` }
      })
    );

    console.log('[wpp-disconnect] Logout response:', logoutRes.status);

    if (!logoutRes.ok) {
      const errorText = await logoutRes.text();
      console.error('[wpp-disconnect] Logout failed:', errorText.substring(0, 200));
      throw new Error(`Failed to logout: ${logoutRes.status}`);
    }

    // Update database
    await supabaseClient
      .from('whatsapp_sessions')
      .update({ 
        status: 'disconnected',
        last_qr_b64: null,
        last_qr_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('organization_id', orgId);

    console.log('[wpp-disconnect] Session marked as disconnected');

    return new Response(
      JSON.stringify({ ok: true, message: 'Disconnected successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[wpp-disconnect] Error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
