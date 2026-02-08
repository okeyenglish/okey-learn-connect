import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-lovable-secret',
};

interface TelegramCrmWebhookPayload {
  account_phone: string;    // sender account phone
  from_id: number | string; // telegram user ID
  from_username?: string;   // telegram username
  text?: string;            // message text
  file_url?: string;        // file URL if any
  file_type?: string;       // file MIME type
  file_name?: string;       // file name
  message_id?: number;      // external message ID
  chat_id?: number;         // telegram chat ID
  timestamp?: string;       // message timestamp
}

Deno.serve(async (req) => {
  console.log('[telegram-crm-webhook] Request received');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: true, status: 'ignored', reason: 'method_not_allowed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let payload: TelegramCrmWebhookPayload;
    try {
      payload = await req.json();
    } catch {
      console.log('[telegram-crm-webhook] Invalid JSON payload');
      return new Response(
        JSON.stringify({ success: true, status: 'ignored', reason: 'invalid_json' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[telegram-crm-webhook] Payload:', JSON.stringify(payload, null, 2));

    // Get webhook key from URL
    const url = new URL(req.url);
    const webhookKey = url.searchParams.get('key');

    if (!webhookKey) {
      console.log('[telegram-crm-webhook] Missing webhook key');
      return new Response(
        JSON.stringify({ success: true, status: 'ignored', reason: 'missing_key' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find integration by webhook_key - include id for smart routing
    const { data: integration, error: integrationError } = await supabase
      .from('messenger_integrations')
      .select('id, organization_id, settings')
      .eq('webhook_key', webhookKey)
      .eq('messenger_type', 'telegram')
      .eq('provider', 'telegram_crm')
      .single();

    if (integrationError || !integration) {
      console.error('[telegram-crm-webhook] Integration not found for key:', webhookKey);
      return new Response(
        JSON.stringify({ success: true, status: 'ignored', reason: 'invalid_key' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organizationId = integration.organization_id;
    const integrationId = integration.id; // Store for smart routing

    // Verify X-Lovable-Secret if configured
    const settings = integration.settings as { secret?: string };
    const expectedSecret = settings?.secret;
    const incomingSecret = req.headers.get('X-Lovable-Secret');

    if (expectedSecret && expectedSecret !== incomingSecret) {
      console.error('[telegram-crm-webhook] Invalid secret');
      return new Response(
        JSON.stringify({ success: true, status: 'ignored', reason: 'invalid_secret' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    const { from_id, text, account_phone } = payload;

    if (!from_id) {
      console.log('[telegram-crm-webhook] Missing from_id');
      return new Response(
        JSON.stringify({ success: true, status: 'ignored', reason: 'missing_from_id' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const telegramUserId = String(from_id);
    const chatId = payload.chat_id ? String(payload.chat_id) : telegramUserId;

    // Find or create client by telegram_user_id
    let clientId: string | null = null;

    // First, try to find existing client
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('telegram_user_id', telegramUserId)
      .maybeSingle();

    if (existingClient) {
      clientId = existingClient.id;
      console.log('[telegram-crm-webhook] Found existing client:', clientId);
    } else {
      // Create new client
      const clientName = payload.from_username 
        ? `@${payload.from_username}` 
        : `Telegram ${telegramUserId}`;

      const { data: newClient, error: createError } = await supabase
        .from('clients')
        .insert({
          organization_id: organizationId,
          telegram_user_id: telegramUserId,
          name: clientName,
          source: 'telegram_crm',
        })
        .select('id')
        .single();

      if (createError) {
        console.error('[telegram-crm-webhook] Error creating client:', createError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create client' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      clientId = newClient.id;
      console.log('[telegram-crm-webhook] Created new client:', clientId);
    }

    // Determine message content
    const messageText = text || (payload.file_url ? '[Файл]' : '[Пустое сообщение]');
    const fileType = payload.file_type || null;
    const fileUrl = payload.file_url || null;
    const fileName = payload.file_name || null;

    // Save message to chat_messages with integration_id for smart routing
    const { data: savedMessage, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        client_id: clientId,
        organization_id: organizationId,
        message_text: messageText,
        message_type: 'client', // incoming from client
        messenger_type: 'telegram',
        is_outgoing: false,
        is_read: false,
        external_message_id: payload.message_id ? String(payload.message_id) : null,
        file_url: fileUrl,
        file_type: fileType,
        file_name: fileName,
        integration_id: integrationId, // Store integration for reply routing
      })
      .select('id')
      .single();

    if (messageError) {
      console.error('[telegram-crm-webhook] Error saving message:', messageError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save message' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[telegram-crm-webhook] Message saved:', savedMessage.id);

    // Update client's last_message_at
    await supabase
      .from('clients')
      .update({ 
        last_message_at: new Date().toISOString(),
        telegram_chat_id: chatId, // Update chat ID for replies
      })
      .eq('id', clientId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: savedMessage.id,
        clientId: clientId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[telegram-crm-webhook] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: true, 
        status: 'ignored', 
        reason: 'internal_error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
