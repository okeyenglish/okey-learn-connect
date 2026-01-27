import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MagicLoginRequest {
  token: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: MagicLoginRequest = await req.json();
    const { token } = body;

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find invitation by token
    const { data: invitation, error: invError } = await adminSupabase
      .from('client_invitations')
      .select('*, clients(*)')
      .eq('invite_token', token)
      .single();

    if (invError || !invitation) {
      console.error('Invitation not found:', invError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Token has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client's user_id
    const userId = invitation.clients?.user_id;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Client not registered' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user email
    const { data: authUser, error: userError } = await adminSupabase.auth.admin.getUserById(userId);
    
    if (userError || !authUser.user) {
      console.error('User not found:', userError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate magic link for the user
    const { data: magicLink, error: linkError } = await adminSupabase.auth.admin.generateLink({
      type: 'magiclink',
      email: authUser.user.email!,
      options: {
        redirectTo: `${req.headers.get('origin') || 'https://newacademcrm.lovable.app'}/parent-portal`
      }
    });

    if (linkError || !magicLink) {
      console.error('Failed to generate magic link:', linkError);
      return new Response(
        JSON.stringify({ error: 'Failed to create session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract session from properties
    const session = magicLink.properties?.access_token && magicLink.properties?.refresh_token
      ? {
          access_token: magicLink.properties.access_token,
          refresh_token: magicLink.properties.refresh_token
        }
      : null;

    // If no direct session, use the hashed_token to verify
    if (!session) {
      // Create session directly using admin API
      const { data: sessionData, error: sessionError } = await adminSupabase.auth.admin.createSession({
        user_id: userId
      });

      if (sessionError || !sessionData) {
        console.error('Failed to create session:', sessionError);
        return new Response(
          JSON.stringify({ error: 'Failed to create session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mark invitation as used (update expires_at to now)
      await adminSupabase
        .from('client_invitations')
        .update({ 
          expires_at: new Date().toISOString(),
          status: 'completed'
        })
        .eq('id', invitation.id);

      console.log('Portal magic login successful for user:', userId);

      return new Response(
        JSON.stringify({
          success: true,
          session: {
            access_token: sessionData.session.access_token,
            refresh_token: sessionData.session.refresh_token
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark invitation as used
    await adminSupabase
      .from('client_invitations')
      .update({ 
        expires_at: new Date().toISOString(),
        status: 'completed'
      })
      .eq('id', invitation.id);

    console.log('Portal magic login successful for user:', userId);

    return new Response(
      JSON.stringify({
        success: true,
        session
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in portal-magic-login:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
