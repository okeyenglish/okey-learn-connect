import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendLoginRequest {
  client_id: string;
  phone?: string;
  first_name?: string;
  messenger?: 'whatsapp' | 'telegram' | 'max' | 'sms';
  telegram_user_id?: string;
}

// Creates a display-safe shortened URL representation
function createDisplayUrl(fullUrl: string, baseUrl: string): string {
  const url = new URL(fullUrl);
  const token = url.searchParams.get('token') || '';
  const shortCode = token.slice(0, 8);
  return `${baseUrl.replace('https://', '')}/portal-login?...${shortCode}`;
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

    const body: SendLoginRequest = await req.json();
    const { client_id, phone, first_name, messenger = 'whatsapp', telegram_user_id } = body;

    if (!client_id) {
      return new Response(
        JSON.stringify({ error: 'client_id is required' }),
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

    // Store magic link token via client_invitations
    const { error: inviteError } = await adminSupabase
      .from('client_invitations')
      .upsert({
        organization_id: profile.organization_id,
        client_id,
        invite_token: magicToken,
        phone: phone || client.phone,
        first_name: first_name || client.first_name || client.name,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        created_by: user.id
      }, {
        onConflict: 'client_id'
      });

    if (inviteError) {
      console.error('Error creating magic link:', inviteError);
      return new Response(
        JSON.stringify({ error: 'Failed to create login link' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate login URL (not fully exposed to manager)
    const baseUrl = req.headers.get('origin') || 'https://newacademcrm.lovable.app';
    const loginUrl = `${baseUrl}/portal-login?token=${magicToken}`;
    const displayUrl = createDisplayUrl(loginUrl, baseUrl);

    // Get organization name
    const { data: org } = await adminSupabase
      .from('organizations')
      .select('name')
      .eq('id', profile.organization_id)
      .single();

    const clientFirstName = first_name || client.first_name || client.name?.split(' ')[0] || '';
    const message = `${clientFirstName ? `${clientFirstName}, н` : 'Н'}аправляю Вам ссылку для входа в личный кабинет ${org?.name || 'школы'}.\n\nСсылка для входа:\n${loginUrl}\n\nСсылка действительна 24 часа.`;

    // Send via selected messenger
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

    console.log('Portal login link sent:', {
      client_id,
      phone: targetPhone,
      messenger,
      displayUrl,
      message_sent: !!sendResult?.success
    });

    // Return shortened URL for display (not full URL)
    return new Response(
      JSON.stringify({
        success: true,
        message_sent: !!sendResult?.success,
        short_url: displayUrl
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
