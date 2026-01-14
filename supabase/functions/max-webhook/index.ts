import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Green API webhook payload types for MAX (v3)
interface GreenApiWebhook {
  typeWebhook: 'incomingMessageReceived' | 'outgoingMessageReceived' | 'outgoingAPIMessageReceived' | 'outgoingMessageStatus' | 'stateInstanceChanged';
  instanceData: {
    idInstance: number;
    wid: string;
    typeInstance: string;
  };
  timestamp: number;
  idMessage?: string;
  senderData?: {
    chatId: string;
    sender: string;
    chatName: string;
    senderName: string;
    senderPhoneNumber?: number;
  };
  messageData?: {
    typeMessage: 'textMessage' | 'extendedTextMessage' | 'imageMessage' | 'videoMessage' | 'documentMessage' | 'audioMessage' | 'locationMessage' | 'contactMessage' | 'pollMessage';
    textMessageData?: {
      textMessage: string;
    };
    extendedTextMessageData?: {
      text: string;
      description?: string;
      title?: string;
      jpegThumbnail?: string;
    };
    fileMessageData?: {
      downloadUrl: string;
      caption: string;
      fileName: string;
      mimeType: string;
    };
    locationMessageData?: {
      latitude: number;
      longitude: number;
      nameLocation?: string;
      address?: string;
    };
    contactMessageData?: {
      displayName: string;
      vcard: string;
    };
  };
  status?: string;
  stateInstance?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body: GreenApiWebhook = await req.json();
    
    console.log('MAX webhook received:', JSON.stringify(body, null, 2));

    const { typeWebhook, instanceData, senderData, messageData, idMessage, timestamp } = body;

    // Find organization by instanceId
    const instanceId = String(instanceData.idInstance);
    
    const { data: messengerSettings, error: settingsError } = await supabase
      .from('messenger_settings')
      .select('organization_id, settings')
      .eq('messenger_type', 'max')
      .eq('is_enabled', true);

    if (settingsError) {
      console.error('Error fetching messenger settings:', settingsError);
      return new Response(JSON.stringify({ error: 'Settings error' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Find matching organization by instanceId
    const matchingSettings = messengerSettings?.find(s => {
      const settings = s.settings as any;
      return settings?.instanceId === instanceId;
    });

    if (!matchingSettings) {
      console.error(`No organization found for MAX instanceId: ${instanceId}`);
      // Return 200 to prevent Green API from retrying
      return new Response(JSON.stringify({ status: 'ignored', reason: 'unknown instance' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const organizationId = matchingSettings.organization_id;
    console.log(`Processing MAX webhook for organization: ${organizationId}`);

    // Handle different webhook types
    switch (typeWebhook) {
      case 'incomingMessageReceived':
        await handleIncomingMessage(supabase, organizationId, body);
        break;
      
      case 'outgoingMessageReceived':
      case 'outgoingAPIMessageReceived':
        // Messages sent from phone or API - could sync if needed
        console.log('Outgoing message received, skipping sync');
        break;
      
      case 'outgoingMessageStatus':
        await handleMessageStatus(supabase, body);
        break;
      
      case 'stateInstanceChanged':
        console.log('Instance state changed:', body.stateInstance);
        break;
      
      default:
        console.log('Unknown webhook type:', typeWebhook);
    }

    return new Response(JSON.stringify({ success: true }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Error processing MAX webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});

async function handleIncomingMessage(supabase: any, organizationId: string, webhook: GreenApiWebhook) {
  const { senderData, messageData, idMessage, timestamp } = webhook;
  
  if (!senderData || !messageData) {
    console.error('Missing senderData or messageData');
    return;
  }

  const { chatId, senderName, senderPhoneNumber } = senderData;
  
  console.log(`Processing incoming MAX message from chatId: ${chatId}, sender: ${senderName}`);

  // Find or create client
  let client = await findOrCreateClient(supabase, organizationId, chatId, senderName, senderPhoneNumber);
  
  if (!client) {
    console.error('Failed to find or create client');
    return;
  }

  // Check for duplicate message
  const { data: existingMessage } = await supabase
    .from('chat_messages')
    .select('id')
    .eq('external_message_id', idMessage)
    .single();

  if (existingMessage) {
    console.log('Duplicate message, skipping:', idMessage);
    return;
  }

  // Extract message content
  let messageText = '';
  let fileUrl = null;
  let fileName = null;
  let fileType = null;
  let messageType = 'text';

  switch (messageData.typeMessage) {
    case 'textMessage':
      messageText = messageData.textMessageData?.textMessage || '';
      break;
    
    case 'extendedTextMessage':
      messageText = messageData.extendedTextMessageData?.text || '';
      break;
    
    case 'imageMessage':
    case 'videoMessage':
    case 'audioMessage':
    case 'documentMessage':
      fileUrl = messageData.fileMessageData?.downloadUrl;
      fileName = messageData.fileMessageData?.fileName;
      fileType = messageData.fileMessageData?.mimeType;
      messageText = messageData.fileMessageData?.caption || `[${messageData.typeMessage}]`;
      messageType = messageData.typeMessage.replace('Message', '');
      break;
    
    case 'locationMessage':
      const loc = messageData.locationMessageData;
      messageText = `📍 ${loc?.nameLocation || 'Location'}: ${loc?.latitude}, ${loc?.longitude}`;
      messageType = 'location';
      break;
    
    case 'contactMessage':
      messageText = `👤 Contact: ${messageData.contactMessageData?.displayName || 'Unknown'}`;
      messageType = 'contact';
      break;
    
    default:
      messageText = `[${messageData.typeMessage}]`;
  }

  // Save message to database
  const { error: insertError } = await supabase
    .from('chat_messages')
    .insert({
      client_id: client.id,
      organization_id: organizationId,
      message_text: messageText,
      message_type: 'client',
      messenger_type: 'max',
      is_outgoing: false,
      is_read: false,
      external_message_id: idMessage,
      file_url: fileUrl,
      file_name: fileName,
      file_type: fileType,
      message_status: 'delivered',
      created_at: new Date(timestamp * 1000).toISOString()
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
      max_chat_id: chatId
    })
    .eq('id', client.id);

  console.log(`Saved incoming MAX message for client ${client.id}`);
}

async function findOrCreateClient(
  supabase: any, 
  organizationId: string, 
  chatId: string, 
  senderName: string,
  senderPhoneNumber?: number
): Promise<any> {
  // Try to find by max_chat_id first
  let { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('max_chat_id', chatId)
    .single();

  if (client) {
    return client;
  }

  // Try to find by max_user_id (numeric format)
  const numericChatId = parseInt(chatId.replace('@c.us', '').replace('-', ''), 10);
  if (!isNaN(numericChatId)) {
    const { data: clientByUserId } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('max_user_id', numericChatId)
      .single();

    if (clientByUserId) {
      // Update max_chat_id for future lookups
      await supabase
        .from('clients')
        .update({ max_chat_id: chatId })
        .eq('id', clientByUserId.id);
      return clientByUserId;
    }
  }

  // Try to find by phone number
  if (senderPhoneNumber) {
    const phoneStr = String(senderPhoneNumber);
    const { data: clientByPhone } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', organizationId)
      .or(`phone.ilike.%${phoneStr}%,phone.ilike.%${phoneStr.slice(-10)}%`)
      .limit(1)
      .single();

    if (clientByPhone) {
      // Update max_chat_id for future lookups
      await supabase
        .from('clients')
        .update({ max_chat_id: chatId })
        .eq('id', clientByPhone.id);
      return clientByPhone;
    }
  }

  // Create new client
  const { data: newClient, error: createError } = await supabase
    .from('clients')
    .insert({
      organization_id: organizationId,
      name: senderName || `MAX User ${chatId}`,
      max_chat_id: chatId,
      max_user_id: !isNaN(numericChatId) ? numericChatId : null,
      phone: senderPhoneNumber ? `+${senderPhoneNumber}` : null,
      is_active: true
    })
    .select()
    .single();

  if (createError) {
    console.error('Error creating client:', createError);
    return null;
  }

  console.log(`Created new client for MAX user: ${newClient.id}`);
  return newClient;
}

async function handleMessageStatus(supabase: any, webhook: GreenApiWebhook) {
  const { idMessage, status } = webhook;
  
  if (!idMessage || !status) {
    return;
  }

  // Map Green API statuses to our format
  const statusMap: Record<string, string> = {
    'sent': 'sent',
    'delivered': 'delivered',
    'read': 'read',
    'failed': 'failed'
  };

  const mappedStatus = statusMap[status] || status;

  // Update message status
  const { error } = await supabase
    .from('chat_messages')
    .update({ message_status: mappedStatus })
    .eq('external_message_id', idMessage);

  if (error) {
    console.error('Error updating message status:', error);
  } else {
    console.log(`Updated message ${idMessage} status to ${mappedStatus}`);
  }
}
