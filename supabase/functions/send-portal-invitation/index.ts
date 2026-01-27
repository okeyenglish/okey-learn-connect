import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendInvitationRequest {
  client_id: string;
  phone: string;
  first_name?: string;
  messenger?: 'whatsapp' | 'telegram' | 'sms';
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

    const body: SendInvitationRequest = await req.json();
    const { client_id, phone, first_name, messenger = 'whatsapp' } = body;

    if (!client_id || !phone) {
      return new Response(
        JSON.stringify({ error: 'client_id and phone are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify client belongs to organization
    const { data: client, error: clientError } = await userSupabase
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await adminSupabase
      .from('client_invitations')
      .select('id, invite_token')
      .eq('client_id', client_id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    let inviteToken: string;

    if (existingInvite) {
      inviteToken = existingInvite.invite_token;
    } else {
      // Create new invitation
      inviteToken = crypto.randomUUID();
      
      const { error: insertError } = await adminSupabase
        .from('client_invitations')
        .insert({
          organization_id: profile.organization_id,
          client_id,
          invite_token: inviteToken,
          phone,
          first_name: first_name || client.first_name || client.name,
          created_by: user.id
        });

      if (insertError) {
        console.error('Error creating invitation:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to create invitation' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate invitation URL
    const baseUrl = req.headers.get('origin') || 'https://newacademcrm.lovable.app';
    const inviteUrl = `${baseUrl}/client-onboarding?token=${inviteToken}`;

    // Get organization name
    const { data: org } = await adminSupabase
      .from('organizations')
      .select('name')
      .eq('id', profile.organization_id)
      .single();

    const message = `Здравствуйте${first_name ? `, ${first_name}` : ''}!\n\nВас приглашают в личный кабинет ${org?.name || 'школы'}.\n\nПерейдите по ссылке для регистрации:\n${inviteUrl}\n\nСсылка действительна 7 дней.`;

    // Send via messenger
    let sendResult = null;
    
    if (messenger === 'whatsapp') {
      // Try to send via WhatsApp
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
    }

    console.log('Portal invitation sent:', {
      client_id,
      phone,
      messenger,
      inviteUrl
    });

    return new Response(
      JSON.stringify({
        success: true,
        invite_token: inviteToken,
        invite_url: inviteUrl,
        message_sent: !!sendResult?.success,
        send_result: sendResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-portal-invitation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
