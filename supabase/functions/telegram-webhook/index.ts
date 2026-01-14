import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WappiMessage {
  id: string;
  profile_id: string;
  wh_type: 'incoming_message' | 'outgoing_message' | 'delivery_status' | 'authorization_status';
  timestamp: string;
  time: number;
  body?: string;
  type: 'text' | 'image' | 'video' | 'document' | 'audio' | 'ptt' | 'location' | 'vcard' | 'sticker';
  from?: string;
  to?: string;
  senderName?: string;
  chatId: string;
  username?: string;
  caption?: string;
  file_link?: string;
  mimetype?: string;
  isForwarded?: boolean;
  quotedMsgId?: string;
}

interface WappiWebhook {
  messages: WappiMessage[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const webhookData: WappiWebhook = await req.json();
    console.log('Received Telegram webhook:', JSON.stringify(webhookData, null, 2));

    if (!webhookData.messages || !Array.isArray(webhookData.messages)) {
      console.log('No messages in webhook data');
      return new Response(
        JSON.stringify({ success: true, message: 'No messages to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    for (const message of webhookData.messages) {
      await processMessage(supabase, message);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processMessage(supabase: any, message: WappiMessage): Promise<void> {
  const { wh_type, profile_id } = message;

  console.log(`Processing message type: ${wh_type} from profile: ${profile_id}`);

  // Find organization by profile_id
  const { data: settings, error: settingsError } = await supabase
    .from('messenger_settings')
    .select('organization_id, is_enabled')
    .eq('messenger_type', 'telegram')
    .eq('settings->>profileId', profile_id)
    .maybeSingle();

  if (settingsError || !settings) {
    console.error('Organization not found for profile_id:', profile_id, settingsError);
    return;
  }

  if (!settings.is_enabled) {
    console.log('Telegram integration is disabled for organization:', settings.organization_id);
    return;
  }

  const organizationId = settings.organization_id;

  switch (wh_type) {
    case 'incoming_message':
      await handleIncomingMessage(supabase, message, organizationId);
      break;
    case 'outgoing_message':
      await handleOutgoingMessage(supabase, message, organizationId);
      break;
    case 'delivery_status':
      await handleDeliveryStatus(supabase, message);
      break;
    case 'authorization_status':
      console.log('Authorization status update:', message);
      break;
    default:
      console.log('Unknown webhook type:', wh_type);
  }
}

async function handleIncomingMessage(
  supabase: any, 
  message: WappiMessage, 
  organizationId: string
): Promise<void> {
  const telegramUserId = message.from ? parseInt(message.from) : null;
  const chatId = message.chatId;
  const senderName = message.senderName || message.username || `User ${message.from}`;

  // Find or create client
  let client = await findOrCreateClient(supabase, {
    organizationId,
    telegramUserId,
    telegramChatId: chatId,
    name: senderName,
    username: message.username
  });

  if (!client) {
    console.error('Failed to find or create client');
    return;
  }

  // Determine message content (type is stored in file_type, message_type is client/manager/system)
  const { messageText, contentType, fileUrl, fileName, fileType } = extractMessageContent(message);

  // Check for duplicate
  const { data: existingMessage } = await supabase
    .from('chat_messages')
    .select('id')
    .eq('external_message_id', message.id)
    .maybeSingle();

  if (existingMessage) {
    console.log('Duplicate message, skipping:', message.id);
    return;
  }

  // Save message - message_type is 'client' for incoming messages
  const { error: insertError } = await supabase
    .from('chat_messages')
    .insert({
      client_id: client.id,
      organization_id: organizationId,
      message_text: messageText,
      message_type: 'client', // incoming message from client
      messenger_type: 'telegram',
      is_outgoing: false,
      is_read: false,
      external_message_id: message.id,
      file_url: fileUrl,
      file_name: fileName,
      file_type: fileType || contentType, // store content type in file_type
      created_at: message.timestamp || new Date().toISOString()
    });

  if (insertError) {
    console.error('Error saving message:', insertError);
    return;
  }

  // Update client's last_message_at
  await supabase
    .from('clients')
    .update({ 
      last_message_at: new Date().toISOString(),
      telegram_chat_id: chatId
    })
    .eq('id', client.id);

  console.log('Incoming message saved successfully');
}

async function handleOutgoingMessage(
  supabase: any,
  message: WappiMessage,
  organizationId: string
): Promise<void> {
  const chatId = message.chatId;
  const telegramUserId = message.to ? parseInt(message.to) : null;

  // Find client by chat_id or telegram_user_id
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('organization_id', organizationId)
    .or(`telegram_chat_id.eq.${chatId},telegram_user_id.eq.${telegramUserId}`)
    .maybeSingle();

  if (!client) {
    console.log('Client not found for outgoing message');
    return;
  }

  // Check for duplicate
  const { data: existingMessage } = await supabase
    .from('chat_messages')
    .select('id')
    .eq('external_message_id', message.id)
    .maybeSingle();

  if (existingMessage) {
    console.log('Duplicate outgoing message, skipping:', message.id);
    return;
  }

  const { messageText, contentType, fileUrl, fileName, fileType } = extractMessageContent(message);

  // Save outgoing message - message_type is 'manager' for outgoing
  await supabase
    .from('chat_messages')
    .insert({
      client_id: client.id,
      organization_id: organizationId,
      message_text: messageText,
      message_type: 'manager', // outgoing from manager
      messenger_type: 'telegram',
      is_outgoing: true,
      is_read: true,
      external_message_id: message.id,
      file_url: fileUrl,
      file_name: fileName,
      file_type: fileType || contentType,
      message_status: 'sent',
      created_at: message.timestamp || new Date().toISOString()
    });

  console.log('Outgoing message saved');
}

async function handleDeliveryStatus(supabase: any, message: WappiMessage): Promise<void> {
  // Update message status based on delivery report
  // Wappi.pro sends delivery status with message id reference
  console.log('Delivery status:', message);
}

async function findOrCreateClient(
  supabase: any,
  params: {
    organizationId: string;
    telegramUserId: number | null;
    telegramChatId: string;
    name: string;
    username?: string;
  }
): Promise<{ id: string } | null> {
  const { organizationId, telegramUserId, telegramChatId, name, username } = params;

  console.log('findOrCreateClient called with:', { organizationId, telegramUserId, telegramChatId, name, username });

  // Try to find by telegram_user_id first
  if (telegramUserId) {
    const { data: clientByUserId } = await supabase
      .from('clients')
      .select('id, telegram_avatar_url')
      .eq('organization_id', organizationId)
      .eq('telegram_user_id', telegramUserId)
      .maybeSingle();

    if (clientByUserId) {
      console.log('Found client by telegram_user_id:', clientByUserId.id);
      // Update telegram_chat_id if needed
      await supabase
        .from('clients')
        .update({ telegram_chat_id: telegramChatId })
        .eq('id', clientByUserId.id);
      return clientByUserId;
    }
  }

  // Try to find by telegram_chat_id
  const { data: clientByChatId } = await supabase
    .from('clients')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('telegram_chat_id', telegramChatId)
    .maybeSingle();

  if (clientByChatId) {
    console.log('Found client by telegram_chat_id:', clientByChatId.id);
    // Update telegram_user_id if we have it
    if (telegramUserId) {
      await supabase
        .from('clients')
        .update({ telegram_user_id: telegramUserId })
        .eq('id', clientByChatId.id);
    }
    return clientByChatId;
  }

  // Try to find by phone number extracted from chatId
  // Telegram chatId often contains phone number like "79123456789"
  const phoneFromChatId = telegramChatId?.replace(/\D/g, '');
  if (phoneFromChatId && phoneFromChatId.length >= 10) {
    console.log('Trying to find client by phone from chatId:', phoneFromChatId);
    
    // Search in clients table by phone
    const { data: clientByPhone } = await supabase
      .from('clients')
      .select('id, phone')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .or(`phone.ilike.%${phoneFromChatId}%,phone.ilike.%${phoneFromChatId.slice(-10)}%`)
      .maybeSingle();

    if (clientByPhone) {
      console.log('Found client by phone:', clientByPhone.id);
      // Update telegram fields
      await supabase
        .from('clients')
        .update({ 
          telegram_chat_id: telegramChatId,
          telegram_user_id: telegramUserId
        })
        .eq('id', clientByPhone.id);
      return clientByPhone;
    }

    // Also search in client_phone_numbers table
    const { data: phoneRecord } = await supabase
      .from('client_phone_numbers')
      .select('client_id')
      .or(`phone.ilike.%${phoneFromChatId}%,phone.ilike.%${phoneFromChatId.slice(-10)}%`)
      .maybeSingle();

    if (phoneRecord) {
      // Verify client belongs to the organization
      const { data: clientFromPhone } = await supabase
        .from('clients')
        .select('id')
        .eq('id', phoneRecord.client_id)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .maybeSingle();

      if (clientFromPhone) {
        console.log('Found client by phone_numbers table:', clientFromPhone.id);
        await supabase
          .from('clients')
          .update({ 
            telegram_chat_id: telegramChatId,
            telegram_user_id: telegramUserId
          })
          .eq('id', clientFromPhone.id);
        return clientFromPhone;
      }
    }
  }

  // Create new client only if no match found
  console.log('No existing client found, creating new one');
  const { data: newClient, error: createError } = await supabase
    .from('clients')
    .insert({
      organization_id: organizationId,
      name: name,
      telegram_user_id: telegramUserId,
      telegram_chat_id: telegramChatId,
      notes: username ? `@${username}` : null,
      is_active: true
    })
    .select('id')
    .single();

  if (createError) {
    console.error('Error creating client:', createError);
    return null;
  }

  console.log('Created new client:', newClient.id);
  return newClient;
}

function extractMessageContent(message: WappiMessage): {
  messageText: string;
  contentType: string;
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
} {
  let messageText = message.body || '';
  let contentType = 'text';
  let fileUrl: string | null = null;
  let fileName: string | null = null;
  let fileType: string | null = null;

  switch (message.type) {
    case 'text':
      contentType = 'text';
      break;
    case 'image':
      contentType = 'image';
      fileUrl = message.file_link || null;
      fileType = message.mimetype || 'image/jpeg';
      messageText = message.caption || '[Изображение]';
      break;
    case 'video':
      contentType = 'video';
      fileUrl = message.file_link || null;
      fileType = message.mimetype || 'video/mp4';
      messageText = message.caption || '[Видео]';
      break;
    case 'document':
      contentType = 'document';
      fileUrl = message.file_link || null;
      fileType = message.mimetype || 'application/octet-stream';
      messageText = message.caption || '[Документ]';
      break;
    case 'audio':
    case 'ptt':
      contentType = 'audio';
      fileUrl = message.file_link || null;
      fileType = message.mimetype || 'audio/ogg';
      messageText = '[Голосовое сообщение]';
      break;
    case 'sticker':
      contentType = 'sticker';
      fileUrl = message.file_link || null;
      messageText = '[Стикер]';
      break;
    case 'location':
      contentType = 'location';
      messageText = '[Геолокация]';
      break;
    case 'vcard':
      contentType = 'contact';
      messageText = '[Контакт]';
      break;
    default:
      contentType = message.type || 'text';
  }

  return { messageText, contentType, fileUrl, fileName, fileType };
}
