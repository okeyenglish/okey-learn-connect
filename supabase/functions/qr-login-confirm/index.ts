import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Get the authorization header from mobile app
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Create client with user's token to verify they're authenticated
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the user from the token
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
      console.error('User auth error:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired session' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Parse request body
    const { token, session } = await req.json();
    
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!session || !session.access_token || !session.refresh_token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Session data is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Use service role to update the token
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Find the pending token
    const { data: tokenData, error: findError } = await supabaseAdmin
      .from('qr_login_tokens')
      .select('id, status, expires_at')
      .eq('token', token)
      .single();

    if (findError || !tokenData) {
      console.log('Token not found for confirm:', token.substring(0, 8));
      return new Response(
        JSON.stringify({ success: false, error: 'Token not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Check if token is still pending
    if (tokenData.status !== 'pending') {
      return new Response(
        JSON.stringify({ success: false, error: `Token already ${tokenData.status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if expired
    if (new Date(tokenData.expires_at) < new Date()) {
      await supabaseAdmin
        .from('qr_login_tokens')
        .update({ status: 'expired' })
        .eq('id', tokenData.id);

      return new Response(
        JSON.stringify({ success: false, error: 'Token has expired' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Update the token with session data
    const { error: updateError } = await supabaseAdmin
      .from('qr_login_tokens')
      .update({
        status: 'confirmed',
        user_id: user.id,
        session_data: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          expires_in: session.expires_in,
          token_type: session.token_type || 'bearer'
        },
        confirmed_at: new Date().toISOString()
      })
      .eq('id', tokenData.id);

    if (updateError) {
      console.error('Error updating token:', updateError);
      throw updateError;
    }

    console.log(`QR token confirmed by user ${user.id}: ${token.substring(0, 8)}...`);

    // Get user profile for response
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Login confirmed',
        user: {
          email: user.email,
          name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : user.email
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in qr-login-confirm:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to confirm QR login' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
