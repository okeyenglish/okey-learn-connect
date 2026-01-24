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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { token } = await req.json();
    
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Look up the token
    const { data, error } = await supabase
      .from('qr_login_tokens')
      .select('id, status, session_data, expires_at, user_id')
      .eq('token', token)
      .single();

    if (error || !data) {
      console.log('Token not found:', token.substring(0, 8));
      return new Response(
        JSON.stringify({ 
          success: false, 
          status: 'not_found',
          error: 'Token not found or expired' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Check if expired
    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      // Mark as expired if still pending
      if (data.status === 'pending') {
        await supabase
          .from('qr_login_tokens')
          .update({ status: 'expired' })
          .eq('id', data.id);
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          status: 'expired' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Return status based on current state
    if (data.status === 'pending') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          status: 'pending',
          expires_at: data.expires_at
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (data.status === 'confirmed' && data.session_data) {
      // Mark as used so it can't be reused
      await supabase
        .from('qr_login_tokens')
        .update({ 
          status: 'used',
          used_at: new Date().toISOString()
        })
        .eq('id', data.id);

      console.log('Token confirmed and used:', token.substring(0, 8));

      return new Response(
        JSON.stringify({ 
          success: true, 
          status: 'confirmed',
          session: data.session_data
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Used or other status
    return new Response(
      JSON.stringify({ 
        success: true, 
        status: data.status 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in qr-login-check:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to check QR token' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
