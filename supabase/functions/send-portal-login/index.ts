import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResetPasswordRequest {
  client_id: string;
  phone: string;
  first_name?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's organization
    const { data: profile } = await userSupabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return new Response(
        JSON.stringify({ error: 'User not in organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ResetPasswordRequest = await req.json();
    const { client_id, phone, first_name } = body;

    if (!client_id || !phone) {
      return new Response(
        JSON.stringify({ error: 'client_id and phone are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify client belongs to organization and has portal enabled
    const { data: client, error: clientError } = await userSupabase
      .from('clients')
      .select('*, user_id')
      .eq('id', client_id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!client.portal_enabled || !client.user_id) {
      return new Response(
        JSON.stringify({ error: 'Client not registered in portal' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate magic link token
    const magicToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store magic link token
    const { error: insertError } = await adminSupabase
      .from('client_magic_links')
      .insert({
        client_id,
        user_id: client.user_id,
        organization_id: profile.organization_id,
        token: magicToken,
        expires_at: expiresAt.toISOString(),
        created_by: user.id
      });

    if (insertError) {
      // If table doesn't exist, create it inline (for first run)
      console.error('Error creating magic link:', insertError);
      
      // Fallback: use client_invitations with special type
      const { error: inviteError } = await adminSupabase
        .from('client_invitations')
        .upsert({
          organization_id: profile.organization_id,
          client_id,
          invite_token: magicToken,
          phone,
          first_name: first_name || client.first_name || client.name,
          status: 'pending',
          expires_at: expiresAt.toISOString(),
          created_by: user.id
        }, {
          onConflict: 'client_id'
        });

      if (inviteError) {
        console.error('Fallback invitation error:', inviteError);
        return new Response(
          JSON.stringify({ error: 'Failed to create reset link' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate login URL (not exposed to manager)
    const baseUrl = req.headers.get('origin') || 'https://newacademcrm.lovable.app';
    const loginUrl = `${baseUrl}/portal-login?token=${magicToken}`;

    // Get organization name
    const { data: org } = await adminSupabase
      .from('organizations')
      .select('name')
      .eq('id', profile.organization_id)
      .single();

    const message = `Здравствуйте${first_name ? `, ${first_name}` : ''}!\n\nВы можете войти в личный кабинет ${org?.name || 'школы'} по ссылке:\n${loginUrl}\n\nСсылка действительна 24 часа.`;

    // Send via WhatsApp (link is ONLY sent to client, not returned to manager)
    let sendResult = null;
    try {
      const wppResponse = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone,
          message,
          organization_id: profile.organization_id
        })
      });
      sendResult = await wppResponse.json();
    } catch (e) {
      console.error('WhatsApp send failed:', e);
    }

    console.log('Portal login link sent:', {
      client_id,
      phone,
      message_sent: !!sendResult?.success
    });

    // IMPORTANT: Do NOT return the actual URL to the manager!
    return new Response(
      JSON.stringify({
        success: true,
        message_sent: !!sendResult?.success,
        // No invite_url returned for security
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-portal-login:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
