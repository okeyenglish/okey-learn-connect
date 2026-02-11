import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramCrmSendRequest {
  clientId: string;
  text?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  integrationId?: string;
}

interface TelegramCrmSettings {
  crmApiUrl: string;
  crmPhoneNumber: string;
  secret?: string;
}

Deno.serve(async (req) => {
  console.log('[telegram-crm-send] Request received');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Use self-hosted Supabase for DB operations
    const selfHostedUrl = Deno.env.get('SELF_HOSTED_URL') || 'https://api.academyos.ru';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(selfHostedUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organizationId = profile.organization_id;

    // Parse request
    const body: TelegramCrmSendRequest = await req.json();
    const { clientId, text, fileUrl, fileName, fileType, integrationId } = body;

    if (!clientId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Client ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!text && !fileUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Message text or file required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Smart routing: determine which integration to use for reply
    let integration;
    
    if (integrationId) {
      // 1. Explicit integration ID provided - use it
      console.log('[telegram-crm-send] Using explicit integrationId:', integrationId);
      const { data, error } = await supabase
        .from('messenger_integrations')
        .select('id, settings, is_enabled')
        .eq('id', integrationId)
        .eq('organization_id', organizationId)
        .eq('provider', 'telegram_crm')
        .single();
      
      if (error || !data) {
        return new Response(
          JSON.stringify({ success: false, error: 'Integration not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      integration = data;
    } else {
      // 2. Smart routing: find the integration from client's last incoming message
      console.log('[telegram-crm-send] Looking for last incoming message integration for client:', clientId);
      
      const { data: lastMessage } = await supabase
        .from('chat_messages')
        .select('integration_id')
        .eq('client_id', clientId)
        .eq('is_outgoing', false)
        .eq('messenger_type', 'telegram')
        .not('integration_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastMessage?.integration_id) {
        console.log('[telegram-crm-send] Found last message integration:', lastMessage.integration_id);
        
        // Check if this integration is still active
        const { data: lastIntegration } = await supabase
          .from('messenger_integrations')
          .select('id, settings, is_enabled')
          .eq('id', lastMessage.integration_id)
          .eq('organization_id', organizationId)
          .eq('is_enabled', true)
          .single();

        if (lastIntegration) {
          console.log('[telegram-crm-send] Using client\'s last integration (smart routing)');
          integration = lastIntegration;
        }
      }

      // 3. Fallback: use primary integration
      if (!integration) {
        console.log('[telegram-crm-send] Fallback to primary integration');
        const { data, error } = await supabase
          .from('messenger_integrations')
          .select('id, settings, is_enabled')
          .eq('organization_id', organizationId)
          .eq('messenger_type', 'telegram')
          .eq('provider', 'telegram_crm')
          .eq('is_primary', true)
          .single();

        if (error || !data) {
          return new Response(
            JSON.stringify({ success: false, error: 'No Telegram CRM integration configured' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        integration = data;
      }
    }

    if (!integration.is_enabled) {
      return new Response(
        JSON.stringify({ success: false, error: 'Telegram CRM integration is disabled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const settings = integration.settings as TelegramCrmSettings;
    const { crmApiUrl, crmPhoneNumber, secret } = settings;

    if (!crmApiUrl || !crmPhoneNumber) {
      return new Response(
        JSON.stringify({ success: false, error: 'Telegram CRM settings incomplete' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client info
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('telegram_user_id, telegram_chat_id, phone, name')
      .eq('id', clientId)
      .eq('organization_id', organizationId)
      .single();

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ success: false, error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine recipient
    const recipient = client.telegram_chat_id || client.telegram_user_id || client.phone;
    
    if (!recipient) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'У клиента нет Telegram контакта',
          code: 'NO_TELEGRAM_CONTACT'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[telegram-crm-send] Sending to:', recipient, 'via:', crmApiUrl);

    // Send message via Telegram CRM server
    const sendPayload: Record<string, unknown> = {
      phone: crmPhoneNumber,
      to: recipient,
      text: text || '',
    };

    if (fileUrl) {
      sendPayload.file_url = fileUrl;
      sendPayload.file_name = fileName;
      sendPayload.file_type = fileType;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (secret) {
      headers['X-Lovable-Secret'] = secret;
    }

    const apiResponse = await fetch(`${crmApiUrl}/telegram/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify(sendPayload),
    });

    let responseData: { status?: string; message_id?: string; error?: string } = {};
    try {
      responseData = await apiResponse.json();
    } catch {
      const responseText = await apiResponse.text().catch(() => '');
      responseData = { error: responseText || `HTTP ${apiResponse.status}` };
    }

    console.log('[telegram-crm-send] API response:', responseData);

    if (!apiResponse.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: responseData.error || `HTTP ${apiResponse.status}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save message to database
    const messageText = text || (fileUrl ? '[Файл]' : '');
    
    const { data: savedMessage, error: saveError } = await supabase
      .from('chat_messages')
      .insert({
        client_id: clientId,
        organization_id: organizationId,
        message_text: messageText,
        message_type: 'manager',
        messenger_type: 'telegram',
        message_status: 'sent',
        is_outgoing: true,
        is_read: true,
        external_message_id: responseData.message_id,
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileType,
      })
      .select('id')
      .single();

    if (saveError) {
      console.error('[telegram-crm-send] Error saving message:', saveError);
    }

    // Update client's last_message_at
    await supabase
      .from('clients')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', clientId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: responseData.message_id,
        savedMessageId: savedMessage?.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[telegram-crm-send] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
