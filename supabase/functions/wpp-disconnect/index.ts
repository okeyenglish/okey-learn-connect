import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
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

    // Get the user from the auth header
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ ok: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id);

    // Get user's organization
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ ok: false, error: 'Organization not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organizationId = profile.organization_id;
    const sessionName = `org_${organizationId}`;
    console.log('Organization ID:', organizationId, 'Session name:', sessionName);

    const WPP_BASE_URL = Deno.env.get('WPP_BASE_URL');
    const WPP_AGG_TOKEN = Deno.env.get('WPP_AGG_TOKEN');

    if (!WPP_BASE_URL || !WPP_AGG_TOKEN) {
      console.error('Missing WPP configuration');
      return new Response(
        JSON.stringify({ ok: false, error: 'WPP configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate token
    console.log('Generating token for session:', sessionName);
    const tokenUrl = `${WPP_BASE_URL}/api/${encodeURIComponent(sessionName)}/${WPP_AGG_TOKEN}/generate-token`;
    console.log('Token URL:', tokenUrl);
    const tokenRes = await fetch(tokenUrl, { method: 'POST' });
    
    console.log('Token response status:', tokenRes.status);
    
    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error('Failed to generate WPP token:', tokenRes.status, '-', errorText);
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: `Failed to generate WPP token: ${tokenRes.status} - ${errorText}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contentType = tokenRes.headers.get('content-type') || '';
    console.log('Token response content-type:', contentType);
    
    if (!contentType.includes('application/json')) {
      const text = await tokenRes.text();
      console.error('Token response is not JSON:', text.substring(0, 200));
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: `WPP API returned non-JSON response: ${text.substring(0, 200)}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenRes.json();
    const wppToken = tokenData.token;

    if (!wppToken) {
      console.error('No token in response');
      return new Response(
        JSON.stringify({ ok: false, error: 'No token received from WPP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Token generated successfully');

    // Logout session
    console.log('Logging out session');
    const logoutUrl = `${WPP_BASE_URL}/api/${encodeURIComponent(sessionName)}/logout-session`;
    console.log('Logout URL:', logoutUrl);
    const logoutRes = await fetch(logoutUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${wppToken}` },
    });

    console.log('Logout response status:', logoutRes.status);

    if (!logoutRes.ok) {
      const errorText = await logoutRes.text();
      console.error('Failed to logout session:', logoutRes.status, '-', errorText);
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: `Failed to logout: ${logoutRes.status}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update database - mark as disconnected
    const { error: updateError } = await supabaseClient
      .from('whatsapp_sessions')
      .update({ 
        status: 'disconnected',
        qr_code: null,
        updated_at: new Date().toISOString()
      })
      .eq('organization_id', organizationId);

    if (updateError) {
      console.error('Failed to update session in DB:', updateError);
    } else {
      console.log('Session marked as disconnected in DB');
    }

    return new Response(
      JSON.stringify({ 
        ok: true,
        message: 'WhatsApp disconnected successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in wpp-disconnect:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
