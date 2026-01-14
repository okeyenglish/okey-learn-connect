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
  contact_username?: string;
  contact_name?: string;
  contact_phone?: string;
  caption?: string;
  file_link?: string;
  mimetype?: string;
  isForwarded?: boolean;
  quotedMsgId?: string;
  thumbnail?: string;
  picture?: string;
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
  const senderName = message.contact_name || message.senderName || message.username || `User ${message.from}`;
  const username = message.contact_username || message.username;
  const avatarUrl = message.thumbnail || message.picture || null;
  
  // Extract phone from contact_phone field (when Telegram reveals it)
  const contactPhone = message.contact_phone?.replace(/\D/g, '') || null;
  const phoneNumber = contactPhone && contactPhone.length >= 10 ? contactPhone : null;
  
  console.log('handleIncomingMessage:', { telegramUserId, chatId, senderName, username, phoneNumber, contactPhone: message.contact_phone });

  // Find or create client
  let client = await findOrCreateClient(supabase, {
    organizationId,
    telegramUserId,
    telegramChatId: chatId,
    name: senderName,
    username: username,
    avatarUrl: avatarUrl,
    phoneNumber: phoneNumber
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

async function mergeClients(
  supabase: any,
  primaryClientId: string,
  duplicateClientId: string,
  telegramChatId: string,
  telegramUserId: number | null
): Promise<void> {
  console.log(`Merging client ${duplicateClientId} into ${primaryClientId}`);
  
  // Move all messages from duplicate to primary client
  const { error: updateMessagesError, count } = await supabase
    .from('chat_messages')
    .update({ client_id: primaryClientId })
    .eq('client_id', duplicateClientId);
  
  if (updateMessagesError) {
    console.error('Error moving messages:', updateMessagesError);
  } else {
    console.log(`Moved ${count || 'unknown number of'} messages to primary client`);
  }
  
  // Update primary client with telegram data
  await supabase
    .from('clients')
    .update({ 
      telegram_chat_id: telegramChatId,
      telegram_user_id: telegramUserId,
      last_message_at: new Date().toISOString()
    })
    .eq('id', primaryClientId);
  
  // Deactivate duplicate client (soft delete)
  await supabase
    .from('clients')
    .update({ 
      is_active: false,
      notes: `Объединён с клиентом. Старые данные: telegram_chat_id=${telegramChatId}`
    })
    .eq('id', duplicateClientId);
  
  console.log('Client merge completed');
}

async function findOrCreateClient(
  supabase: any,
  params: {
    organizationId: string;
    telegramUserId: number | null;
    telegramChatId: string;
    name: string;
    username?: string;
    avatarUrl?: string | null;
    phoneNumber?: string | null; // From contact_phone field
  }
): Promise<{ id: string } | null> {
  const { organizationId, telegramUserId, telegramChatId, name, username, avatarUrl, phoneNumber } = params;

  console.log('findOrCreateClient called with:', { organizationId, telegramUserId, telegramChatId, name, username, avatarUrl, phoneNumber });

  // Helper function to update client with avatar and phone
  const updateClientData = async (clientId: string, additionalData: any = {}) => {
    const updateData: any = { ...additionalData };
    if (avatarUrl) {
      updateData.telegram_avatar_url = avatarUrl;
    }
    if (Object.keys(updateData).length > 0) {
      await supabase
        .from('clients')
        .update(updateData)
        .eq('id', clientId);
    }
  };

  // PRIORITY 1: If we have a phone number from contact_phone, try to find existing client by phone
  // This handles the case when Telegram reveals the phone number
  if (phoneNumber) {
    console.log('Trying to find client by contact_phone:', phoneNumber);
    
    // Search in clients table by phone
    const { data: clientByContactPhone } = await supabase
      .from('clients')
      .select('id, phone, telegram_chat_id, telegram_user_id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .or(`phone.ilike.%${phoneNumber}%,phone.ilike.%${phoneNumber.slice(-10)}%`)
      .maybeSingle();

    if (clientByContactPhone) {
      console.log('Found client by contact_phone:', clientByContactPhone.id);
      
      // Check if there's an existing telegram client (without phone) that should be merged
      if (telegramUserId || telegramChatId) {
        const orConditions = [];
        if (telegramChatId) orConditions.push(`telegram_chat_id.eq.${telegramChatId}`);
        if (telegramUserId) orConditions.push(`telegram_user_id.eq.${telegramUserId}`);
        
        const { data: telegramOnlyClient } = await supabase
          .from('clients')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .neq('id', clientByContactPhone.id)
          .or(orConditions.join(','))
          .maybeSingle();
        
        if (telegramOnlyClient) {
          console.log('Merging telegram client into phone-based client:', telegramOnlyClient.id, '->', clientByContactPhone.id);
          await mergeClients(supabase, clientByContactPhone.id, telegramOnlyClient.id, telegramChatId, telegramUserId);
        }
      }
      
      // Update telegram fields on the found client
      await updateClientData(clientByContactPhone.id, {
        telegram_chat_id: telegramChatId,
        telegram_user_id: telegramUserId
      });
      
      return clientByContactPhone;
    }
    
    // Also search in client_phone_numbers table
    const { data: phoneRecord } = await supabase
      .from('client_phone_numbers')
      .select('client_id')
      .or(`phone.ilike.%${phoneNumber}%,phone.ilike.%${phoneNumber.slice(-10)}%`)
      .maybeSingle();

    if (phoneRecord) {
      const { data: clientFromPhone } = await supabase
        .from('clients')
        .select('id')
        .eq('id', phoneRecord.client_id)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .maybeSingle();

      if (clientFromPhone) {
        console.log('Found client by contact_phone in phone_numbers table:', clientFromPhone.id);
        
        // Check for telegram-only duplicate to merge
        if (telegramUserId || telegramChatId) {
          const orConditions = [];
          if (telegramChatId) orConditions.push(`telegram_chat_id.eq.${telegramChatId}`);
          if (telegramUserId) orConditions.push(`telegram_user_id.eq.${telegramUserId}`);
          
          const { data: telegramOnlyClient } = await supabase
            .from('clients')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('is_active', true)
            .neq('id', clientFromPhone.id)
            .or(orConditions.join(','))
            .maybeSingle();
          
          if (telegramOnlyClient) {
            await mergeClients(supabase, clientFromPhone.id, telegramOnlyClient.id, telegramChatId, telegramUserId);
          }
        }
        
        await updateClientData(clientFromPhone.id, {
          telegram_chat_id: telegramChatId,
          telegram_user_id: telegramUserId
        });
        
        return clientFromPhone;
      }
    }
  }

  // PRIORITY 2: Try to find by telegram_user_id
  if (telegramUserId) {
    const { data: clientByUserId } = await supabase
      .from('clients')
      .select('id, phone, telegram_avatar_url')
      .eq('organization_id', organizationId)
      .eq('telegram_user_id', telegramUserId)
      .eq('is_active', true)
      .maybeSingle();

    if (clientByUserId) {
      console.log('Found client by telegram_user_id:', clientByUserId.id);
      
      // If we now have a phone number, update the client and check for merging
      if (phoneNumber && !clientByUserId.phone) {
        // Check if another client exists with this phone
        const { data: clientByPhone } = await supabase
          .from('clients')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .neq('id', clientByUserId.id)
          .or(`phone.ilike.%${phoneNumber}%,phone.ilike.%${phoneNumber.slice(-10)}%`)
          .maybeSingle();
        
        if (clientByPhone) {
          // Merge this telegram client into the phone-based client
          await mergeClients(supabase, clientByPhone.id, clientByUserId.id, telegramChatId, telegramUserId);
          await updateClientData(clientByPhone.id);
          return clientByPhone;
        }
        
        // No existing phone client, update this client with the phone
        await updateClientData(clientByUserId.id, { 
          telegram_chat_id: telegramChatId,
          phone: `+${phoneNumber}`
        });
      } else {
        await updateClientData(clientByUserId.id, { telegram_chat_id: telegramChatId });
      }
      
      return clientByUserId;
    }
  }

  // PRIORITY 3: Try to find by telegram_chat_id
  const { data: clientByChatId } = await supabase
    .from('clients')
    .select('id, phone, telegram_avatar_url')
    .eq('organization_id', organizationId)
    .eq('telegram_chat_id', telegramChatId)
    .eq('is_active', true)
    .maybeSingle();

  if (clientByChatId) {
    console.log('Found client by telegram_chat_id:', clientByChatId.id);
    
    // If we now have a phone number from contact_phone, update and possibly merge
    if (phoneNumber && !clientByChatId.phone) {
      const { data: clientByPhone } = await supabase
        .from('clients')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .neq('id', clientByChatId.id)
        .or(`phone.ilike.%${phoneNumber}%,phone.ilike.%${phoneNumber.slice(-10)}%`)
        .maybeSingle();
      
      if (clientByPhone) {
        // Merge: move messages from numberless client to phone-based client
        await mergeClients(supabase, clientByPhone.id, clientByChatId.id, telegramChatId, telegramUserId);
        await updateClientData(clientByPhone.id);
        return clientByPhone;
      }
      
      // No existing phone client, update this client
      const updateData: any = { phone: `+${phoneNumber}` };
      if (telegramUserId) updateData.telegram_user_id = telegramUserId;
      await updateClientData(clientByChatId.id, updateData);
    } else {
      const updateData: any = {};
      if (telegramUserId) updateData.telegram_user_id = telegramUserId;
      await updateClientData(clientByChatId.id, updateData);
    }
    
    return clientByChatId;
  }

  // PRIORITY 4: Try to find by phone from chatId (legacy fallback)
  const phoneFromChatId = telegramChatId?.replace(/\D/g, '');
  if (phoneFromChatId && phoneFromChatId.length >= 10) {
    console.log('Trying to find client by phone from chatId:', phoneFromChatId);
    
    const { data: clientByPhone } = await supabase
      .from('clients')
      .select('id, phone')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .or(`phone.ilike.%${phoneFromChatId}%,phone.ilike.%${phoneFromChatId.slice(-10)}%`)
      .maybeSingle();

    if (clientByPhone) {
      console.log('Found client by phone from chatId:', clientByPhone.id);
      await updateClientData(clientByPhone.id, {
        telegram_chat_id: telegramChatId,
        telegram_user_id: telegramUserId
      });
      return clientByPhone;
    }
  }

  // Create new client only if no match found
  console.log('No existing client found, creating new one');
  const finalPhone = phoneNumber ? `+${phoneNumber}` : (phoneFromChatId && phoneFromChatId.length >= 10 ? `+${phoneFromChatId}` : null);
  
  const { data: newClient, error: createError } = await supabase
    .from('clients')
    .insert({
      organization_id: organizationId,
      name: name,
      telegram_user_id: telegramUserId,
      telegram_chat_id: telegramChatId,
      telegram_avatar_url: avatarUrl,
      phone: finalPhone,
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
