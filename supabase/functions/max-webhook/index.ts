import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { 
  corsHeaders,
  handleCors, 
  successResponse,
  errorResponse,
  getErrorMessage,
  sendPushNotification,
  getOrgAdminManagerUserIds,
  type MaxWebhookPayload,
  type MaxWebhookInstanceData,
  type MaxWebhookSenderData,
  type MaxWebhookMessageData,
  type MaxWebhookType
} from '../_shared/types.ts';

const DEFAULT_GREEN_API_URL = 'https://api.green-api.com';
const GREEN_API_URL =
  Deno.env.get('MAX_GREEN_API_URL') ||
  Deno.env.get('GREEN_API_URL') ||
  DEFAULT_GREEN_API_URL;

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body: MaxWebhookPayload = await req.json();
    
    console.log('MAX webhook received:', JSON.stringify(body, null, 2));

    const { typeWebhook, instanceData, senderData, messageData, idMessage, timestamp } = body;

    // Validate required webhook fields
    if (!instanceData?.idInstance) {
      console.log('[max-webhook] Invalid payload - missing instanceData.idInstance');
      return successResponse({ status: 'ignored', reason: 'invalid payload' });
    }

    // Find organization by instanceId
    const instanceId = String(instanceData.idInstance);
    
    // First try messenger_integrations (new multi-account table)
    let organizationId: string | null = null;
    let integrationId: string | null = null;
    
    const { data: integration } = await supabase
      .from('messenger_integrations')
      .select('id, organization_id, settings')
      .eq('messenger_type', 'max')
      .eq('is_enabled', true)
      .filter('settings->>instanceId', 'eq', instanceId)
      .maybeSingle();

    if (integration) {
      organizationId = integration.organization_id;
      integrationId = integration.id;
      console.log(`[max-webhook] Found integration in messenger_integrations: ${integrationId}`);
    }

    // Fallback to messenger_settings (legacy)
    if (!organizationId) {
      const { data: messengerSettings, error: settingsError } = await supabase
        .from('messenger_settings')
        .select('organization_id, settings')
        .eq('messenger_type', 'max')
        .eq('is_enabled', true);

      if (settingsError) {
        console.error('Error fetching messenger settings:', settingsError);
        return errorResponse('Settings error', 500);
      }

      // Find matching organization by instanceId
      const matchingSettings = messengerSettings?.find(s => {
        const settings = s.settings as Record<string, unknown>;
        return settings?.instanceId === instanceId;
      });

      if (matchingSettings) {
        organizationId = matchingSettings.organization_id;
      }
    }

    if (!organizationId) {
      console.error(`No organization found for MAX instanceId: ${instanceId}`);
      // Return 200 to prevent Green API from retrying
      return successResponse({ status: 'ignored', reason: 'unknown instance' });
    }

    console.log(`Processing MAX webhook for organization: ${organizationId}, integrationId: ${integrationId}`);

    // Handle different webhook types
    switch (typeWebhook) {
      case 'incomingMessageReceived':
        await handleIncomingMessage(supabase, organizationId, body, integrationId);
        break;
      
      case 'outgoingMessageReceived':
      case 'outgoingAPIMessageReceived':
        // Messages sent from phone or API - sync to CRM
        console.log('Outgoing message received, syncing to CRM');
        await handleOutgoingMessage(supabase, organizationId, body, integrationId);
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

    return successResponse({ success: true });

  } catch (error: unknown) {
    console.error('Error processing MAX webhook:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});

async function handleIncomingMessage(supabase: ReturnType<typeof createClient>, organizationId: string, webhook: MaxWebhookPayload, integrationId: string | null = null) {
  const { senderData, messageData, idMessage, timestamp } = webhook;
  
  if (!senderData || !messageData) {
    console.error('Missing senderData or messageData');
    return;
  }

  const { chatId, senderName, senderPhoneNumber } = senderData;
  
  console.log(`Processing incoming MAX message from chatId: ${chatId}, sender: ${senderName}`);

  // Check for duplicate message first
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
  const { messageText, fileUrl: rawFileUrl, fileName, fileType, messageType } = extractMessageContent(messageData);

  // Upload media to permanent storage if we have a temporary GreenAPI URL
  let fileUrl = rawFileUrl;
  if (rawFileUrl) {
    const permanentUrl = await uploadMediaToStorage(supabase, organizationId, rawFileUrl, fileType);
    if (permanentUrl) {
      fileUrl = permanentUrl;
    }
  }

  // PRIORITY 1: Check if sender is a TEACHER by max_user_id or max_chat_id
  const maxUserId = extractPhoneFromChatId(chatId);
  const { data: teacherData } = await supabase
    .from('teachers')
    .select('id, first_name, last_name')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .or(`max_user_id.eq.${maxUserId},max_chat_id.eq.${chatId}`)
    .maybeSingle();

  if (teacherData) {
    console.log('[max-webhook] Found teacher by max_user_id/max_chat_id:', teacherData.id);
    
    // Save message with teacher_id (not client_id)
    const { error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        teacher_id: teacherData.id,
        client_id: null,
        organization_id: organizationId,
        integration_id: integrationId,  // Smart routing
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
        created_at: new Date((timestamp || Date.now() / 1000) * 1000).toISOString()
      });

    if (insertError) {
      console.error('Error saving teacher message:', insertError);
      return;
    }

    // Update teacher's max_chat_id if needed
    await supabase
      .from('teachers')
      .update({ max_chat_id: chatId })
      .eq('id', teacherData.id);

    console.log(`[max-webhook] Saved message for TEACHER ${teacherData.id}`);
    return; // Exit early - don't create client
  }

  // PRIORITY 2: Normal client flow (not a teacher)
  const client = await findOrCreateClient(supabase, organizationId, chatId, senderName, senderPhoneNumber);
  
  if (!client) {
    console.error('Failed to find or create client');
    return;
  }

  // Save message to database
  const { error: insertError } = await supabase
    .from('chat_messages')
    .insert({
      client_id: client.id,
      teacher_id: null,
      organization_id: organizationId,
      integration_id: integrationId,  // Smart routing
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
      created_at: new Date((timestamp || Date.now() / 1000) * 1000).toISOString()
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

  // Sync teacher data if this client is linked to a teacher
  const maxUserIdForSync = extractPhoneFromChatId(chatId);
  await syncTeacherFromClient(supabase, client.id, {
    phone: senderPhoneNumber ? String(senderPhoneNumber) : null,
    maxUserId: maxUserIdForSync,
    maxChatId: chatId
  });

  // Send push notifications to managers/admins in this organization
  try {
    const userIds = await getOrgAdminManagerUserIds(supabase, organizationId);

    if (userIds.length > 0) {
      // Format: "Имя Фамилия" as title, message text as body
      const clientFullName = client.first_name && client.last_name 
        ? `${client.first_name} ${client.last_name}`.trim()
        : client.name || senderName;
      
      const { messageText: msgText } = extractMessageContent(messageData);
      
      const pushResult = await sendPushNotification({
        userIds,
        payload: {
          title: '📨 MAX',
          body: `${clientFullName}: ${msgText.slice(0, 80)}${msgText.length > 80 ? '...' : ''}`,
          icon: client.avatar_url || '/pwa-192x192.png',
          url: `/newcrm?clientId=${client.id}`,
          tag: `max-${client.id}-${Date.now()}`,
        },
      });
      console.log('Push notification sent for MAX message to', userIds.length, 'users in org:', organizationId, 'result:', pushResult);
      
      // Log push result for diagnostics
      supabase.from('webhook_logs').insert({
        messenger_type: 'push-diagnostic',
        event_type: 'max-push-sent',
        webhook_data: {
          clientId: client.id,
          organizationId,
          userIds,
          pushResult,
          timestamp: new Date().toISOString(),
        },
        processed: true
      }).then(({ error }) => {
        if (error) console.error('[max-webhook] Failed to log push result:', error)
      });
    }
  } catch (pushErr) {
    console.error('Error sending push notification:', pushErr);
  }
}

// Generate a file name from mimeType when GreenAPI doesn't provide one
function generateFileName(mimeType: string | null, typeMessage?: string): string {
  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
    'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/opus': 'opus',
    'application/pdf': 'pdf',
  };
  let ext = 'bin';
  if (mimeType && extMap[mimeType]) {
    ext = extMap[mimeType];
  } else if (mimeType) {
    const sub = mimeType.split('/')[1];
    if (sub) ext = sub.split(';')[0];
  } else if (typeMessage) {
    if (typeMessage === 'imageMessage') ext = 'jpg';
    else if (typeMessage === 'videoMessage') ext = 'mp4';
    else if (typeMessage === 'audioMessage') ext = 'ogg';
  }
  return `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

// Upload media from temporary GreenAPI URL to Supabase Storage
async function uploadMediaToStorage(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  downloadUrl: string,
  mimeType: string | null
): Promise<string | null> {
  try {
    console.log('[max-webhook] Downloading media from GreenAPI:', downloadUrl.slice(0, 80));
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      console.error('[max-webhook] Failed to download media:', response.status);
      return null;
    }
    const blob = await response.blob();
    const ext = generateFileName(mimeType).split('.').pop() || 'bin';
    const storagePath = `${orgId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('chat-media')
      .upload(storagePath, blob, {
        contentType: mimeType || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      console.error('[max-webhook] Storage upload error:', uploadError);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('chat-media')
      .getPublicUrl(storagePath);

    console.log('[max-webhook] Media uploaded to storage:', publicUrlData.publicUrl?.slice(0, 80));
    return publicUrlData.publicUrl || null;
  } catch (err) {
    console.error('[max-webhook] uploadMediaToStorage error:', err);
    return null;
  }
}

// Helper to extract message content from webhook data
function extractMessageContent(messageData: MaxWebhookMessageData): {
  messageText: string;
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  messageType: string;
} {
  let messageText = '';
  let fileUrl: string | null = null;
  let fileName: string | null = null;
  let fileType: string | null = null;
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
      fileUrl = messageData.fileMessageData?.downloadUrl || null;
      fileType = messageData.fileMessageData?.mimeType || null;
      // Always ensure fileName is set — generate one if GreenAPI didn't provide it
      fileName = messageData.fileMessageData?.fileName || generateFileName(fileType, messageData.typeMessage);
      // Use caption if available, otherwise create readable message based on type
      if (messageData.fileMessageData?.caption) {
        messageText = messageData.fileMessageData.caption;
      } else {
        const typeName = messageData.typeMessage;
        if (typeName === 'imageMessage') messageText = '🖼️ Изображение';
        else if (typeName === 'videoMessage') messageText = '🎬 Видео';
        else if (typeName === 'audioMessage') messageText = '🎵 Аудио';
        else if (typeName === 'documentMessage') messageText = `📄 ${fileName || 'Документ'}`;
        else messageText = '📎 Файл';
      }
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

  return { messageText, fileUrl, fileName, fileType, messageType };
}

interface ClientRecord {
  id: string;
  name?: string;
  phone?: string;
  avatar_url?: string;
  holihope_metadata?: Record<string, unknown>;
  max_chat_id?: string;
  max_user_id?: number;
  [key: string]: unknown;
}

async function findOrCreateClient(
  supabase: ReturnType<typeof createClient>, 
  organizationId: string, 
  chatId: string, 
  senderName?: string,
  senderPhoneNumber?: number
): Promise<ClientRecord | null> {
  // Helper to restore deactivated client
  const restoreIfInactive = async (foundClient: any) => {
    if (foundClient.is_active === false) {
      console.log('[max-webhook] Restoring deactivated client:', foundClient.id);
      await supabase.from('clients').update({ is_active: true }).eq('id', foundClient.id);
    }
  };

  // Try to find by max_chat_id first (no is_active filter)
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('max_chat_id', chatId)
    .maybeSingle();

  if (client) {
    await restoreIfInactive(client);
    await enrichClientFromMax(supabase, organizationId, client.id, chatId);
    return client as ClientRecord;
  }

  // Try to find by max_user_id (numeric format)
  const numericChatId = parseInt(chatId.replace('@c.us', '').replace('-', ''), 10);
  if (!isNaN(numericChatId)) {
    const { data: clientByUserId } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('max_user_id', numericChatId)
      .maybeSingle();

    if (clientByUserId) {
      await restoreIfInactive(clientByUserId);
      await supabase.from('clients').update({ max_chat_id: chatId }).eq('id', clientByUserId.id);
      await enrichClientFromMax(supabase, organizationId, clientByUserId.id, chatId);
      return clientByUserId as ClientRecord;
    }
  }

  // Try to find by phone number
  if (senderPhoneNumber) {
    const phoneStr = String(senderPhoneNumber);
    const { data: clientsByPhone } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', organizationId)
      .or(`phone.ilike.%${phoneStr}%,phone.ilike.%${phoneStr.slice(-10)}%`)
      .limit(1);

    const clientByPhone = clientsByPhone?.[0];
    if (clientByPhone) {
      await restoreIfInactive(clientByPhone);
      await supabase.from('clients').update({ max_chat_id: chatId }).eq('id', clientByPhone.id);
      await enrichClientFromMax(supabase, organizationId, clientByPhone.id, chatId);
      return clientByPhone as ClientRecord;
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
    // Handle unique constraint — restore deactivated client
    if (createError.code === '23505') {
      console.log('[max-webhook] Unique constraint hit, searching for existing client');
      const { data: conflictClient } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('max_chat_id', chatId)
        .maybeSingle();
      if (conflictClient) {
        await restoreIfInactive(conflictClient);
        return conflictClient as ClientRecord;
      }
    }
    console.error('Error creating client:', createError);
    return null;
  }

  console.log(`Created new client for MAX user: ${newClient.id}`);
  
  // Enrich new client data from MAX
  await enrichClientFromMax(supabase, organizationId, newClient.id, chatId);
  
  return newClient as ClientRecord;
}

// Enrich client data from MAX contact info
async function enrichClientFromMax(
  supabase: ReturnType<typeof createClient>, 
  organizationId: string, 
  clientId: string, 
  chatId: string
): Promise<void> {
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

    const settings = messengerSettings.settings as Record<string, unknown>;
    const instanceId = settings?.instanceId as string | undefined;
    const apiToken = settings?.apiToken as string | undefined;

    if (!instanceId || !apiToken) {
      console.log('MAX credentials not configured for enrichment');
      return;
    }

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

    const contactData = await contactResponse.json() as Record<string, unknown>;
    console.log('MAX contact info response:', JSON.stringify(contactData));

    // Also try to get avatar
    const avatarUrl = `${GREEN_API_URL}/v3/waInstance${instanceId}/getAvatar/${apiToken}`;
    let avatarData: Record<string, unknown> | null = null;
    
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

    const updateData: Record<string, unknown> = {};
    
    // Extract contact info
    const contactName = (contactData.name || contactData.chatName || contactData.pushname || contactData.displayName) as string | undefined;
    const contactPhone = (contactData.numberPhone || contactData.phone) as string | undefined;
    const contactAbout = (contactData.about || contactData.description) as string | undefined;

    // Update name if current is auto-generated
    const currentName = (currentClient.name as string) || '';
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
    const avatarUrlValue = avatarData?.urlAvatar as string | undefined;
    if (avatarUrlValue) {
      // Always save to max_avatar_url for messenger-specific display
      updateData.max_avatar_url = avatarUrlValue;
      console.log(`Setting MAX avatar for client ${clientId}`);
      
      // Also update main avatar_url if client doesn't have one
      if (!currentClient.avatar_url) {
        updateData.avatar_url = avatarUrlValue;
      }
    }

    // Save additional info to metadata
    const existingMetadata = (currentClient.holihope_metadata as Record<string, unknown>) || {};
    const maxInfo = (existingMetadata.max_info as Record<string, unknown>) || {};

    const newMaxInfo: Record<string, unknown> = {
      ...maxInfo,
      last_updated: new Date().toISOString()
    };

    if (contactName) newMaxInfo.name = contactName;
    if (contactPhone) newMaxInfo.phone = contactPhone;
    if (contactAbout) newMaxInfo.about = contactAbout;
    if (avatarUrlValue) newMaxInfo.avatar_url = avatarUrlValue;
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
  } catch (error: unknown) {
    console.error('Error in enrichClientFromMax:', getErrorMessage(error));
  }
}

// Handle outgoing messages (sent from phone or API)
async function handleOutgoingMessage(
  supabase: ReturnType<typeof createClient>, 
  organizationId: string, 
  webhook: MaxWebhookPayload,
  integrationId: string | null = null
): Promise<void> {
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
  let client: { id: string } | null = null;
  
  const { data: clientData } = await supabase
    .from('clients')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('max_chat_id', chatId)
    .maybeSingle();

  if (clientData) {
    client = clientData;
  } else {
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

  // Extract message content
  const { messageText, fileUrl: rawFileUrl, fileName, fileType } = extractMessageContent(messageData);

  // Upload media to permanent storage
  let fileUrl = rawFileUrl;
  if (rawFileUrl) {
    const permanentUrl = await uploadMediaToStorage(supabase, organizationId, rawFileUrl, fileType);
    if (permanentUrl) {
      fileUrl = permanentUrl;
    }
  }

  // Save message as outgoing (from manager/phone)
  const { error: insertError } = await supabase
    .from('chat_messages')
    .insert({
      client_id: client.id,
      organization_id: organizationId,
      integration_id: integrationId,  // Smart routing
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
      created_at: new Date((timestamp || Date.now() / 1000) * 1000).toISOString()
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

async function handleMessageStatus(
  supabase: ReturnType<typeof createClient>, 
  webhook: MaxWebhookPayload
): Promise<void> {
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
  supabase: ReturnType<typeof createClient>,
  clientId: string,
  data: { phone?: string | null; maxChatId?: string | null }
): Promise<void> {
  if (!data.maxChatId) return;

  try {
    let phoneRecord: { id: string } | null = null;
    
    if (data.phone) {
      const cleanPhone = data.phone.replace(/\D/g, '');
      if (cleanPhone.length >= 10) {
        const { data: records } = await supabase
          .from('client_phone_numbers')
          .select('id')
          .eq('client_id', clientId)
          .or(`phone.ilike.%${cleanPhone}%,phone.ilike.%${cleanPhone.slice(-10)}%`)
          .limit(1);
        phoneRecord = records?.[0] || null;
      }
    }
    
    if (!phoneRecord) {
      const { data: primaryRecord } = await supabase
        .from('client_phone_numbers')
        .select('id')
        .eq('client_id', clientId)
        .eq('is_primary', true)
        .single();
      phoneRecord = primaryRecord;
    }
    
    if (phoneRecord) {
      await supabase
        .from('client_phone_numbers')
        .update({ max_chat_id: data.maxChatId })
        .eq('id', phoneRecord.id);
      console.log(`Updated max_chat_id for phone record ${phoneRecord.id}`);
    }
  } catch (error: unknown) {
    console.error('Error updating phone number messenger data:', getErrorMessage(error));
  }
}

// Extract phone number from chatId (format: 79999999999@c.us)
function extractPhoneFromChatId(chatId: string): string {
  return chatId.replace('@c.us', '').replace('@g.us', '').replace('-', '');
}

// Normalize phone to standard format (79161234567)
function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('8') && cleaned.length === 11) {
    cleaned = '7' + cleaned.substring(1);
  }
  if (cleaned.length === 10 && cleaned.startsWith('9')) {
    cleaned = '7' + cleaned;
  }
  return cleaned;
}

// Sync teacher data from linked client
async function syncTeacherFromClient(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
  data: {
    phone?: string | null;
    maxUserId?: string | null;
    maxChatId?: string | null;
  }
): Promise<void> {
  try {
    // 1. Find link to teacher
    const { data: teacherLink, error: linkError } = await supabase
      .from('teacher_client_links')
      .select('teacher_id')
      .eq('client_id', clientId)
      .maybeSingle();

    if (linkError) {
      console.log('Error finding teacher link:', linkError);
      return;
    }

    if (!teacherLink) {
      console.log('No teacher link found for client:', clientId);
      return;
    }

    console.log(`Found teacher link: client ${clientId} -> teacher ${teacherLink.teacher_id}`);

    // 2. Get current teacher data
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('phone, max_user_id, max_chat_id')
      .eq('id', teacherLink.teacher_id)
      .single();

    if (teacherError || !teacher) {
      console.error('Error fetching teacher:', teacherError);
      return;
    }

    // 3. Update only empty fields
    const updateData: Record<string, unknown> = {};
    
    if (data.phone && !teacher.phone) {
      const normalizedPhone = normalizePhone(data.phone);
      if (normalizedPhone && normalizedPhone.length >= 10) {
        updateData.phone = normalizedPhone;
      }
    }
    
    if (data.maxUserId && !teacher.max_user_id) {
      updateData.max_user_id = data.maxUserId;
    }
    
    if (data.maxChatId && !teacher.max_chat_id) {
      updateData.max_chat_id = data.maxChatId;
    }

    // 4. Save if there are updates
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('teachers')
        .update(updateData)
        .eq('id', teacherLink.teacher_id);

      if (updateError) {
        console.error('Error updating teacher:', updateError);
      } else {
        console.log(`Synced MAX data to teacher ${teacherLink.teacher_id}:`, updateData);
      }
    } else {
      console.log('No new data to sync for teacher:', teacherLink.teacher_id);
    }
  } catch (error: unknown) {
    console.error('Error in syncTeacherFromClient:', getErrorMessage(error));
  }
}
