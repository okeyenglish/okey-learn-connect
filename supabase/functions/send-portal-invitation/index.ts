import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendInvitationRequest {
  client_id: string;
  phone?: string;
  first_name?: string;
  messenger?: 'whatsapp' | 'telegram' | 'max' | 'sms';
  telegram_user_id?: string;
}

// Simple URL shortener - creates a hash-like short code
function createShortUrl(fullUrl: string, baseUrl: string): { shortUrl: string; displayUrl: string } {
  // Extract token from URL
  const url = new URL(fullUrl);
  const token = url.searchParams.get('token') || '';
  // Use first 8 characters of token as short code
  const shortCode = token.slice(0, 8);
  const shortUrl = `${baseUrl}/i/${shortCode}`;
  // Display version shows masked URL
  const displayUrl = `${baseUrl.replace('https://', '')}/i/${shortCode}...`;
  return { shortUrl: fullUrl, displayUrl }; // For now, use full URL but show masked version
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
    const { client_id, phone, first_name, messenger = 'whatsapp', telegram_user_id } = body;

    if (!client_id) {
      return new Response(
        JSON.stringify({ error: 'client_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!phone && messenger !== 'telegram') {
      return new Response(
        JSON.stringify({ error: 'phone is required for non-telegram messengers' }),
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
          phone: phone || client.phone,
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
    const { displayUrl } = createShortUrl(inviteUrl, baseUrl);

    // Get organization name
    const { data: org } = await adminSupabase
      .from('organizations')
      .select('name')
      .eq('id', profile.organization_id)
      .single();

    const clientFirstName = first_name || client.first_name || client.name?.split(' ')[0] || '';
    const message = `${clientFirstName ? `${clientFirstName}, н` : 'Н'}аправляю Вам ссылку для входа в личный кабинет ${org?.name || 'школы'}.\n\nСсылка для регистрации:\n${inviteUrl}\n\nСсылка действительна 7 дней.`;

    // Send via messenger
    let sendResult = null;
    const targetPhone = phone || client.phone;
    const targetTelegramId = telegram_user_id || client.telegram_user_id;
    
    if (messenger === 'whatsapp' && targetPhone) {
      try {
        const wppResponse = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            phone: targetPhone,
            message,
            organization_id: profile.organization_id
          })
        });
        sendResult = await wppResponse.json();
      } catch (e) {
        console.error('WhatsApp send failed:', e);
      }
    } else if (messenger === 'telegram' && targetTelegramId) {
      try {
        const tgResponse = await fetch(`${supabaseUrl}/functions/v1/telegram-send`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            chat_id: targetTelegramId,
            text: message,
            organization_id: profile.organization_id
          })
        });
        sendResult = await tgResponse.json();
      } catch (e) {
        console.error('Telegram send failed:', e);
      }
    } else if (messenger === 'max' && targetPhone) {
      try {
        const maxResponse = await fetch(`${supabaseUrl}/functions/v1/max-send`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            phone: targetPhone,
            message,
            organization_id: profile.organization_id
          })
        });
        sendResult = await maxResponse.json();
      } catch (e) {
        console.error('MAX send failed:', e);
      }
    }

    console.log('Portal invitation sent:', {
      client_id,
      phone: targetPhone,
      messenger,
      inviteUrl: displayUrl,
      sendResult
    });

    return new Response(
      JSON.stringify({
        success: true,
        invite_token: inviteToken,
        invite_url: inviteUrl,
        short_url: displayUrl,
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
