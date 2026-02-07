import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-lovable-secret',
};

interface TelegramCrmWebhookPayload {
  project_id: string;       // organization_id
  account_phone: string;    // sender account phone
  from_id: number | string; // telegram user ID
  from_username?: string;   // telegram username
  text?: string;            // message text
  file_url?: string;        // file URL if any
  file_type?: string;       // file MIME type
  file_name?: string;       // file name
  message_id?: string;      // external message ID
  chat_id?: string;         // telegram chat ID
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

    // Validate required fields
    const { project_id, from_id, text, account_phone } = payload;
    
    if (!project_id) {
      console.log('[telegram-crm-webhook] Missing project_id');
      return new Response(
        JSON.stringify({ success: true, status: 'ignored', reason: 'missing_project_id' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!from_id) {
      console.log('[telegram-crm-webhook] Missing from_id');
      return new Response(
        JSON.stringify({ success: true, status: 'ignored', reason: 'missing_from_id' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify organization exists
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', project_id)
      .single();

    if (orgError || !organization) {
      console.error('[telegram-crm-webhook] Organization not found:', project_id);
      return new Response(
        JSON.stringify({ success: true, status: 'ignored', reason: 'organization_not_found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organizationId = project_id;
    const telegramUserId = String(from_id);
    const chatId = payload.chat_id || telegramUserId;

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

    // Save message to chat_messages
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
        external_message_id: payload.message_id || null,
        file_url: fileUrl,
        file_type: fileType,
        file_name: fileName,
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
