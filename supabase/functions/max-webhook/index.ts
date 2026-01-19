import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_GREEN_API_URL = 'https://api.green-api.com';
const GREEN_API_URL =
  Deno.env.get('MAX_GREEN_API_URL') ||
  Deno.env.get('GREEN_API_URL') ||
  DEFAULT_GREEN_API_URL;

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
        // Messages sent from phone or API - sync to CRM
        console.log('Outgoing message received, syncing to CRM');
        await handleOutgoingMessage(supabase, organizationId, body);
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

  // Also update max_chat_id in client_phone_numbers if phone matches
  await updatePhoneNumberMessengerData(supabase, client.id, {
    phone: senderPhoneNumber ? String(senderPhoneNumber) : null,
    maxChatId: chatId
  });

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
    // Enrich existing client data if needed
    await enrichClientFromMax(supabase, organizationId, client.id, chatId);
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
      
      // Enrich client data
      await enrichClientFromMax(supabase, organizationId, clientByUserId.id, chatId);
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
      
      // Enrich client data
      await enrichClientFromMax(supabase, organizationId, clientByPhone.id, chatId);
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
  
  // Enrich new client data from MAX
  await enrichClientFromMax(supabase, organizationId, newClient.id, chatId);
  
  return newClient;
}

// Enrich client data from MAX contact info
async function enrichClientFromMax(supabase: any, organizationId: string, clientId: string, chatId: string) {
  try {
    // Get MAX settings for this organization
    const { data: messengerSettings } = await supabase
      .from('messenger_settings')
      .select('settings')
      .eq('organization_id', organizationId)
      .eq('messenger_type', 'max')
      .eq('is_enabled', true)
      .single();

    if (!messengerSettings) {
      console.log('MAX settings not found for enrichment');
      return;
    }

    const settings = messengerSettings.settings as any;
    const instanceId = settings?.instanceId;
    const apiToken = settings?.apiToken;

    if (!instanceId || !apiToken) {
      console.log('MAX credentials not configured for enrichment');
      return;
    }

    // GREEN_API_URL is defined at module scope

    // Get contact info from MAX API
    const contactInfoUrl = `${GREEN_API_URL}/v3/waInstance${instanceId}/getContactInfo/${apiToken}`;
    
    console.log(`Fetching MAX contact info for ${chatId}`);
    
    const contactResponse = await fetch(contactInfoUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId })
    });

    if (!contactResponse.ok) {
      console.log(`Failed to get MAX contact info: ${contactResponse.status}`);
      return;
    }

    const contactData = await contactResponse.json();
    console.log('MAX contact info response:', JSON.stringify(contactData));

    // Also try to get avatar
    const avatarUrl = `${GREEN_API_URL}/v3/waInstance${instanceId}/getAvatar/${apiToken}`;
    let avatarData: any = null;
    
    try {
      const avatarResponse = await fetch(avatarUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId })
      });
      
      if (avatarResponse.ok) {
        avatarData = await avatarResponse.json();
        console.log('MAX avatar response:', JSON.stringify(avatarData));
      }
    } catch (e) {
      console.log('Error fetching MAX avatar:', e);
    }

    // Get current client data
    const { data: currentClient } = await supabase
      .from('clients')
      .select('name, phone, avatar_url, holihope_metadata')
      .eq('id', clientId)
      .single();

    if (!currentClient) {
      console.log('Client not found for MAX enrichment:', clientId);
      return;
    }

    const updateData: Record<string, any> = {};
    
    // Extract contact info
    const contactName = contactData.name || contactData.chatName || contactData.pushname || contactData.displayName;
    const contactPhone = contactData.numberPhone || contactData.phone;
    const contactAbout = contactData.about || contactData.description;

    // Update name if current is auto-generated
    const currentName = currentClient.name || '';
    const isAutoName = currentName === 'Без имени' ||
                       currentName.startsWith('Клиент ') || 
                       currentName.startsWith('+') || 
                       /^\d+$/.test(currentName) ||
                       currentName.includes('@c.us') ||
                       currentName.startsWith('MAX User') ||
                       currentName.startsWith('Telegram ');

    if (contactName && isAutoName) {
      updateData.name = contactName;
      console.log(`Updating MAX client name from "${currentName}" to "${contactName}"`);
    }

    // Update phone if missing
    if (contactPhone && !currentClient.phone) {
      const formattedPhone = String(contactPhone).startsWith('+') ? contactPhone : `+${contactPhone}`;
      updateData.phone = formattedPhone;
    }

    // Update avatar if we got one - save to both main avatar_url and max_avatar_url
    if (avatarData?.urlAvatar) {
      // Always save to max_avatar_url for messenger-specific display
      updateData.max_avatar_url = avatarData.urlAvatar;
      console.log(`Setting MAX avatar for client ${clientId}`);
      
      // Also update main avatar_url if client doesn't have one
      if (!currentClient.avatar_url) {
        updateData.avatar_url = avatarData.urlAvatar;
      }
    }

    // Save additional info to metadata
    const existingMetadata = (currentClient.holihope_metadata as Record<string, any>) || {};
    const maxInfo = existingMetadata.max_info || {};

    const newMaxInfo: Record<string, any> = {
      ...maxInfo,
      last_updated: new Date().toISOString()
    };

    if (contactName) newMaxInfo.name = contactName;
    if (contactPhone) newMaxInfo.phone = contactPhone;
    if (contactAbout) newMaxInfo.about = contactAbout;
    if (avatarData?.urlAvatar) newMaxInfo.avatar_url = avatarData.urlAvatar;
    if (contactData.email) newMaxInfo.email = contactData.email;
    if (contactData.lastSeen) newMaxInfo.last_seen = contactData.lastSeen;

    updateData.holihope_metadata = {
      ...existingMetadata,
      max_info: newMaxInfo
    };

    // Update client
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', clientId);

      if (updateError) {
        console.error('Error enriching MAX client data:', updateError);
      } else {
        console.log(`Client ${clientId} enriched with MAX data:`, Object.keys(updateData));
      }
    }
  } catch (error) {
    console.error('Error in enrichClientFromMax:', error);
  }
}

// Handle outgoing messages (sent from phone or API)
async function handleOutgoingMessage(supabase: any, organizationId: string, webhook: GreenApiWebhook) {
  const { senderData, messageData, idMessage, timestamp } = webhook;
  
  // For outgoing messages, senderData contains the recipient info
  const chatId = senderData?.chatId;
  
  if (!chatId || !messageData) {
    console.log('Missing chatId or messageData for outgoing message');
    return;
  }

  console.log(`Processing outgoing MAX message to chatId: ${chatId}`);

  // Check for duplicate message first (message might have been sent via CRM)
  const { data: existingMessage } = await supabase
    .from('chat_messages')
    .select('id')
    .eq('external_message_id', idMessage)
    .maybeSingle();

  if (existingMessage) {
    console.log('Outgoing message already exists (sent via CRM), skipping:', idMessage);
    return;
  }

  // Find client by max_chat_id
  let { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('max_chat_id', chatId)
    .maybeSingle();

  if (!client) {
    // Try to find in client_phone_numbers
    const { data: phoneRecord } = await supabase
      .from('client_phone_numbers')
      .select('client_id, clients!inner(organization_id)')
      .eq('max_chat_id', chatId)
      .eq('clients.organization_id', organizationId)
      .maybeSingle();

    if (phoneRecord) {
      client = { id: phoneRecord.client_id };
    }
  }

  if (!client) {
    console.log(`Client not found for outgoing MAX message to ${chatId}, skipping`);
    return;
  }

  // Extract message content (same logic as incoming)
  let messageText = '';
  let fileUrl = null;
  let fileName = null;
  let fileType = null;

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
      break;
    
    case 'locationMessage':
      const loc = messageData.locationMessageData;
      messageText = `📍 ${loc?.nameLocation || 'Location'}: ${loc?.latitude}, ${loc?.longitude}`;
      break;
    
    case 'contactMessage':
      messageText = `👤 Contact: ${messageData.contactMessageData?.displayName || 'Unknown'}`;
      break;
    
    default:
      messageText = `[${messageData.typeMessage}]`;
  }

  // Save message as outgoing (from manager/phone)
  const { error: insertError } = await supabase
    .from('chat_messages')
    .insert({
      client_id: client.id,
      organization_id: organizationId,
      message_text: messageText,
      message_type: 'manager', // Sent by manager (from phone)
      messenger_type: 'max',
      is_outgoing: true,
      is_read: true, // Outgoing messages are already read
      external_message_id: idMessage,
      file_url: fileUrl,
      file_name: fileName,
      file_type: fileType,
      message_status: 'sent',
      created_at: new Date(timestamp * 1000).toISOString()
    });

  if (insertError) {
    console.error('Error saving outgoing MAX message:', insertError);
    return;
  }

  // Update client's last_message_at
  await supabase
    .from('clients')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', client.id);

  console.log(`Saved outgoing MAX message for client ${client.id}`);
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

// Helper function to update messenger data in client_phone_numbers  
async function updatePhoneNumberMessengerData(
  supabase: any,
  clientId: string,
  data: { phone?: string | null; maxChatId?: string | null }
): Promise<void> {
  if (!data.maxChatId) return

  try {
    let phoneRecord = null
    
    if (data.phone) {
      const cleanPhone = data.phone.replace(/\D/g, '')
      if (cleanPhone.length >= 10) {
        const { data: records } = await supabase
          .from('client_phone_numbers')
          .select('id')
          .eq('client_id', clientId)
          .or(`phone.ilike.%${cleanPhone}%,phone.ilike.%${cleanPhone.slice(-10)}%`)
          .limit(1)
        phoneRecord = records?.[0]
      }
    }
    
    if (!phoneRecord) {
      const { data: primaryRecord } = await supabase
        .from('client_phone_numbers')
        .select('id')
        .eq('client_id', clientId)
        .eq('is_primary', true)
        .single()
      phoneRecord = primaryRecord
    }
    
    if (phoneRecord) {
      await supabase
        .from('client_phone_numbers')
        .update({ max_chat_id: data.maxChatId })
        .eq('id', phoneRecord.id)
      console.log(`Updated max_chat_id for phone record ${phoneRecord.id}`)
    }
  } catch (error) {
    console.error('Error updating phone number messenger data:', error)
  }
}
