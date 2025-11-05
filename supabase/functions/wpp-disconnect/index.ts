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
  const url = `${BASE}/api/${sessionName}/${SECRET}/generate-token`;
  console.log('[wpp-disconnect] POST', url.replace(SECRET, '***'));
  
  const res = await withTimeout(
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
  );

  console.log('[wpp-disconnect] Token response:', res.status);
  
  if (!res.ok) {
    throw new Error(`generate-token failed: ${res.status}`);
  }
  
  const text = await res.text();
  if (!text?.trim()) {
    throw new Error('Empty response from generate-token');
  }
  
  const data = JSON.parse(text);
  if (!data?.token) {
    throw new Error('No token in response');
  }
  
  console.log('[wpp-disconnect] ✓ Token obtained');
  return data.token;
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
