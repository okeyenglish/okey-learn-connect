import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import {
  corsHeaders,
  handleCors,
  getErrorMessage,
  sendPushNotification,
  getOrgAdminManagerUserIds,
  type TelegramWappiMessage,
} from '../_shared/types.ts';

/**
 * Resilient insert for chat_messages that handles schema differences between
 * Cloud and self-hosted instances. Self-hosted may lack columns like 'status',
 * 'teacher_id', 'metadata', etc.
 */
async function resilientInsertMessage(
  supabase: any,
  payload: Record<string, any>
): Promise<{ data: any; error: any }> {
  // First attempt: full payload
  const { data, error } = await supabase
    .from('chat_messages')
    .insert(payload)
    .select('id')
    .maybeSingle();

  if (!error) {
    return { data, error: null };
  }

  // Check if error is due to missing columns
  const errorMessage = error?.message || '';
  const isMissingColumn = errorMessage.includes('column') && 
    (errorMessage.includes('does not exist') || errorMessage.includes('не существует'));

  if (!isMissingColumn) {
    // Different error, return as-is
    return { data: null, error };
  }

  console.log('[telegram-webhook] Full insert failed, trying minimal payload:', errorMessage);

  // Fallback: minimal required columns for self-hosted
  // Self-hosted schema: message_text (NOT NULL), message_type (NOT NULL), organization_id (NOT NULL)
  const minimalPayload: Record<string, any> = {
    client_id: payload.client_id || null,
    organization_id: payload.organization_id,
    message_text: payload.message_text || '[Сообщение]',
    message_type: payload.message_type || 'client',
    messenger_type: payload.messenger_type || 'telegram',
    is_outgoing: payload.is_outgoing ?? false,
    is_read: payload.is_read ?? false,
    external_message_id: payload.external_message_id || null,
    file_url: payload.file_url || null,
    file_name: payload.file_name || null,
    file_type: payload.file_type || null,
  };

  // Only add created_at if provided
  if (payload.created_at) {
    minimalPayload.created_at = payload.created_at;
  }

  const { data: data2, error: error2 } = await supabase
    .from('chat_messages')
    .insert(minimalPayload)
    .select('id')
    .maybeSingle();

  if (error2) {
    console.error('[telegram-webhook] Minimal insert also failed:', error2.message);
  }

  return { data: data2, error: error2 };
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);

  // Lightweight health check (useful on self-hosted to confirm routing/auth)
  if (req.method === 'GET') {
    const pathParts = url.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1] || null;
    const queryProfileId = url.searchParams.get('profile_id') || url.searchParams.get('profileId');
    const pathProfileId = lastPart && lastPart !== 'telegram-webhook' ? lastPart : null;

    return new Response(
      JSON.stringify({
        ok: true,
        health: 'telegram-webhook',
        time: new Date().toISOString(),
        path: url.pathname,
        profileId: queryProfileId || pathProfileId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Wappi/webhooks should not break on method mismatches
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

    // Extract profile_id from URL path or query
    const pathParts = url.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1] || '';
    const queryProfileId = url.searchParams.get('profile_id') || url.searchParams.get('profileId');
    const pathProfileId = lastPart && lastPart !== 'telegram-webhook' ? lastPart : null;

    // IMPORTANT: Wappi profile_id can be UUID-like (with hyphens) or other non-hex identifiers.
    // We accept a safe subset of characters and reasonable length.
    const urlProfileIdRaw = (queryProfileId || pathProfileId || '').toString().trim();
    const urlProfileId = urlProfileIdRaw.length > 0 ? urlProfileIdRaw : null;
    const isValidUrlProfileId =
      !!urlProfileId &&
      urlProfileId.length >= 4 &&
      urlProfileId.length <= 128 &&
      /^[a-z0-9-]+$/i.test(urlProfileId);

    console.log('[telegram-webhook] URL profile_id:', urlProfileId, 'valid:', isValidUrlProfileId);

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      console.log('[telegram-webhook] Invalid JSON payload');
      return new Response(
        JSON.stringify({ success: true, status: 'ignored', reason: 'invalid_json' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Received Telegram webhook:', JSON.stringify(payload, null, 2));

    // Extract messages from payload (Wappi may send either { messages: [...] } or a single message object)
    const messages: TelegramWappiMessage[] = Array.isArray((payload as any)?.messages)
      ? ((payload as any).messages as TelegramWappiMessage[])
      : ((payload as any)?.wh_type ? [payload as TelegramWappiMessage] : []);

    // === DIAGNOSTIC LOGGING ===
    // Log every webhook call for debugging (fire-and-forget)
    const payloadProfileId = messages[0]?.profile_id || (payload as any)?.profile_id;
    supabase.from('webhook_logs').insert({
      messenger_type: 'telegram',
      event_type: 'webhook-received',
      webhook_data: {
        url: url.toString(),
        queryProfileId,
        pathProfileId,
        urlProfileId,
        isValidUrlProfileId,
        payloadProfileId,
        messagesCount: messages.length,
        whTypes: messages.map((m: any) => m.wh_type),
        timestamp: new Date().toISOString(),
      },
      processed: false,
    }).then(({ error }) => {
      if (error) console.error('[telegram-webhook] Failed to log webhook:', error.message);
    });

    if (!messages.length) {
      console.log('[telegram-webhook] No messages in webhook payload');
      return new Response(
        JSON.stringify({ success: true, status: 'ignored', reason: 'no_messages' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Pass urlProfileId as fallback for routing
    const fallbackProfileId = isValidUrlProfileId ? (urlProfileId as string) : null;

    for (const message of messages) {
      await processMessage(supabase, message, fallbackProfileId);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Telegram webhook error:', error);
    // Return 200 to prevent retry storms from Wappi
    return new Response(
      JSON.stringify({ success: true, status: 'error', error: getErrorMessage(error) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function resolveOrganizationByTelegramProfileId(
  supabase: any,
  profileId: string
): Promise<{ organizationId: string; integrationId?: string } | null> {
  console.log('[telegram-webhook] Resolving organization for profile_id:', profileId);

  if (!profileId) {
    console.error('[telegram-webhook] Empty profileId');
    return null;
  }

  // PRIORITY 1: messenger_integrations (multi-account) - now returns integrationId for smart routing
  try {
    const { data: integrations, error } = await supabase
      .from('messenger_integrations')
      .select('id, organization_id, is_enabled, settings')
      .eq('messenger_type', 'telegram')
      .eq('is_enabled', true)
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('[telegram-webhook] messenger_integrations lookup failed:', error.message);
    } else if (integrations && integrations.length > 0) {
      for (const integration of integrations) {
        const settingsObj = (integration.settings || {}) as any;

        const storedProfileId =
          settingsObj?.profileId ||
          settingsObj?.wappiProfileId ||
          settingsObj?.profile_id ||
          settingsObj?.telegramProfileId ||
          settingsObj?.telegram_profile_id ||
          settingsObj?.telegram?.profileId ||
          settingsObj?.telegram?.profile_id;

        if (storedProfileId && String(storedProfileId) === String(profileId)) {
          console.log('[telegram-webhook] Found org via messenger_integrations:', integration.organization_id, 'integrationId:', integration.id);
          return { organizationId: integration.organization_id, integrationId: integration.id };
        }

        // Extra resilience: if settings schema differs, fallback to substring search
        try {
          const settingsStr = JSON.stringify(settingsObj);
          if (settingsStr && settingsStr.includes(String(profileId))) {
            console.log('[telegram-webhook] Found org via messenger_integrations (substring match):', integration.organization_id, 'integrationId:', integration.id);
            return { organizationId: integration.organization_id, integrationId: integration.id };
          }
        } catch {
          // ignore stringify issues
        }
      }
    }
  } catch (e) {
    console.warn('[telegram-webhook] messenger_integrations lookup threw:', e);
  }

  // PRIORITY 2: messenger_settings (legacy) - no integrationId available
  try {
    const { data: allSettings, error: settingsError } = await supabase
      .from('messenger_settings')
      .select('organization_id, settings, is_enabled')
      .eq('messenger_type', 'telegram')
      .eq('is_enabled', true)
      .not('organization_id', 'is', null)
      .order('updated_at', { ascending: false });

    if (settingsError) {
      console.error('[telegram-webhook] messenger_settings query error:', settingsError.message);
      return null;
    }

    if (!allSettings || allSettings.length === 0) {
      console.warn('[telegram-webhook] No Telegram settings found in messenger_settings');
      return null;
    }

    for (const setting of allSettings) {
      const settingsObj = (setting.settings || {}) as any;

      const storedProfileId =
        settingsObj?.profileId ||
        settingsObj?.wappiProfileId ||
        settingsObj?.profile_id ||
        settingsObj?.telegramProfileId ||
        settingsObj?.telegram_profile_id ||
        settingsObj?.telegram?.profileId ||
        settingsObj?.telegram?.profile_id;

      if (storedProfileId && String(storedProfileId) === String(profileId)) {
        console.log('[telegram-webhook] Found org via messenger_settings:', setting.organization_id);
        return { organizationId: setting.organization_id };
      }

      // Extra resilience
      try {
        const settingsStr = JSON.stringify(settingsObj);
        if (settingsStr && settingsStr.includes(String(profileId))) {
          console.log('[telegram-webhook] Found org via messenger_settings (substring match):', setting.organization_id);
          return { organizationId: setting.organization_id };
        }
      } catch {
        // ignore
      }
    }
  } catch (e) {
    console.error('[telegram-webhook] messenger_settings scan threw:', e);
  }

  console.error('[telegram-webhook] Organization not found for profile_id:', profileId);
  return null;
}

async function processMessage(supabase: any, message: TelegramWappiMessage, fallbackProfileId: string | null): Promise<void> {
  const { wh_type, profile_id } = message;

  // Use profile_id from payload, or from URL path as fallback
  const effectiveProfileId = profile_id || fallbackProfileId;
  
  if (!effectiveProfileId) {
    console.error('[telegram-webhook] No profile_id in payload or URL, cannot route message');
    return;
  }

  console.log(`Processing message type: ${wh_type} from profile: ${effectiveProfileId} (payload: ${profile_id}, fallback: ${fallbackProfileId})`);

  // Find organization by profile_id (supports both messenger_integrations and legacy messenger_settings)
  const resolvedOrg = await resolveOrganizationByTelegramProfileId(supabase, effectiveProfileId);
  if (!resolvedOrg) return;

  const organizationId = resolvedOrg.organizationId;
  const integrationId = resolvedOrg.integrationId; // For smart routing

  switch (wh_type) {
    case 'incoming_message':
      await handleIncomingMessage(supabase, message, organizationId, integrationId);
      break;
    case 'outgoing_message':
    case 'outgoing_message_phone':
    case 'outgoing_message_api':
      // outgoing_message_phone - сообщения отправленные с телефона
      // outgoing_message_api - сообщения отправленные через API
      await handleOutgoingMessage(supabase, message, organizationId, integrationId);
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
  message: TelegramWappiMessage, 
  organizationId: string,
  integrationId?: string
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

  // Check for duplicate message first (before any heavy operations)
  const { data: existingMessage } = await supabase
    .from('chat_messages')
    .select('id')
    .eq('external_message_id', message.id)
    .maybeSingle();

  if (existingMessage) {
    console.log('Duplicate message, skipping:', message.id);
    return;
  }

  // Determine message content (type is stored in file_type, message_type is client/manager/system)
  const { messageText, contentType, fileUrl, fileName, fileType } = extractMessageContent(message);

  // PRIORITY 1: Check if sender is a TEACHER by telegram_user_id
  let teacher = null;
  if (telegramUserId) {
    const { data: teacherData } = await supabase
      .from('teachers')
      .select('id, first_name, last_name')
      .eq('organization_id', organizationId)
      .eq('telegram_user_id', String(telegramUserId))
      .eq('is_active', true)
      .maybeSingle();
    
    if (teacherData) {
      teacher = teacherData;
      console.log('[telegram-webhook] Found teacher by telegram_user_id:', teacher.id);
    }
  }

  // If teacher found, save message with teacher_id (not client_id)
  if (teacher) {
    // Full payload for cloud, will fallback for self-hosted
    const fullPayload: Record<string, any> = {
      teacher_id: teacher.id,
      client_id: null, // Explicitly null for teacher messages
      organization_id: organizationId,
      message_text: messageText,
      message_type: 'client', // incoming message
      messenger_type: 'telegram',
      is_outgoing: false,
      is_read: false,
      external_message_id: message.id,
      file_url: fileUrl,
      file_name: fileName,
      file_type: fileType || contentType,
      created_at: message.timestamp || new Date().toISOString()
    };
    
    // Add integration_id for smart routing (if available from messenger_integrations)
    if (integrationId) {
      fullPayload.integration_id = integrationId;
    }

    const { error: insertError } = await resilientInsertMessage(supabase, fullPayload);

    if (insertError) {
      console.error('Error saving teacher message:', insertError);
      return;
    }

    // Update teacher's telegram_chat_id if needed
    await supabase
      .from('teachers')
      .update({ telegram_chat_id: chatId })
      .eq('id', teacher.id);

    console.log(`[telegram-webhook] Saved message for TEACHER ${teacher.id}`);
    return; // Exit early - don't create client
  }

  // PRIORITY 2: Normal client flow (not a teacher)
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

  // Try to enrich client data if name is auto-generated (like "Без имени")
  await enrichClientFromTelegram(supabase, client.id, {
    contactName: senderName,
    username: username,
    avatarUrl: avatarUrl,
    phoneNumber: phoneNumber
  });

  // Save message with client_id - use resilient insert for self-hosted compatibility
  const fullPayload: Record<string, any> = {
    client_id: client.id,
    teacher_id: null,
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
  };
  
  // Add integration_id for smart routing (if available from messenger_integrations)
  if (integrationId) {
    fullPayload.integration_id = integrationId;
  }

  const { error: insertError } = await resilientInsertMessage(supabase, fullPayload);

  if (insertError) {
    console.error('Error saving message:', insertError);
    return;
  }

  // Update client's last_message_at and telegram_chat_id
  await supabase
    .from('clients')
    .update({ 
      last_message_at: new Date().toISOString(),
      telegram_chat_id: chatId
    })
    .eq('id', client.id);

  // Also update telegram_chat_id in client_phone_numbers if phone matches
  await updatePhoneNumberMessengerData(supabase, client.id, {
    phone: phoneNumber,
    telegramChatId: chatId,
    telegramUserId: telegramUserId,
    telegramAvatarUrl: avatarUrl
  });

  console.log('Incoming message saved successfully');

  // Send push notifications to managers/admins in this organization
  try {
    const userIds = await getOrgAdminManagerUserIds(supabase, organizationId);

    if (userIds.length > 0) {
      // Format: "Имя Фамилия" as title, message text as body
      const clientFullName = client.first_name && client.last_name 
        ? `${client.first_name} ${client.last_name}`.trim()
        : client.name || senderName;
      
      const pushResult = await sendPushNotification({
        userIds,
        payload: {
          title: '✈️ Telegram',
          body: `${clientFullName}: ${messageText.slice(0, 80)}${messageText.length > 80 ? '...' : ''}`,
          icon: client.avatar_url || '/pwa-192x192.png',
          url: `/newcrm?clientId=${client.id}`,
          tag: `telegram-${client.id}-${Date.now()}`,
        },
      });
      console.log('Push notification sent for Telegram message to', userIds.length, 'users in org:', organizationId, 'result:', pushResult);
      
      // Log push result for diagnostics
      supabase.from('webhook_logs').insert({
        messenger_type: 'push-diagnostic',
        event_type: 'telegram-push-sent',
        webhook_data: {
          clientId: client.id,
          organizationId,
          userIds,
          pushResult,
          timestamp: new Date().toISOString(),
        },
        processed: true
      }).then(({ error }) => {
        if (error) console.error('[telegram-webhook] Failed to log push result:', error)
      });
    }
  } catch (pushErr) {
    console.error('Error sending push notification:', pushErr);
  }
}

async function handleOutgoingMessage(
  supabase: any,
  message: TelegramWappiMessage,
  organizationId: string,
  integrationId?: string
): Promise<void> {
  const chatId = message.chatId;
  const telegramUserId = message.to ? parseInt(message.to) : null;
  const contactPhone = message.contact_phone?.replace(/\D/g, '') || null;
  const contactUsername = message.contact_username || null;
  const contactName = message.contact_name || null;

  console.log('handleOutgoingMessage: Starting search for client', {
    chatId,
    telegramUserId,
    contactPhone,
    contactUsername,
    contactName
  });

  let client = null;

  // PRIORITY 1: Find by telegram_chat_id or telegram_user_id (use limit(1) to avoid maybeSingle error with duplicates)
  const { data: clientsByTelegram, error: telegramError } = await supabase
    .from('clients')
    .select('id')
    .eq('organization_id', organizationId)
    .or(`telegram_chat_id.eq.${chatId},telegram_user_id.eq.${telegramUserId}`)
    .limit(1);

  if (telegramError) {
    console.error('Error finding client by telegram:', telegramError);
  } else if (clientsByTelegram && clientsByTelegram.length > 0) {
    client = clientsByTelegram[0];
    console.log('handleOutgoingMessage: Found client by telegram_chat_id/user_id:', client.id);
  }

  // PRIORITY 2: Find by contact_phone in clients table
  if (!client && contactPhone && contactPhone.length >= 10) {
    const phoneLast10 = contactPhone.slice(-10);
    console.log('handleOutgoingMessage: Searching by phone:', phoneLast10);
    
    const { data: clientsByPhone, error: phoneError } = await supabase
      .from('clients')
      .select('id')
      .eq('organization_id', organizationId)
      .ilike('phone', `%${phoneLast10}%`)
      .limit(1);

    if (phoneError) {
      console.error('Error finding client by phone:', phoneError);
    } else if (clientsByPhone && clientsByPhone.length > 0) {
      client = clientsByPhone[0];
      console.log('handleOutgoingMessage: Found client by phone:', client.id);
      
      // Update telegram data on found client
      const { error: updateError } = await supabase
        .from('clients')
        .update({ 
          telegram_chat_id: chatId, 
          telegram_user_id: telegramUserId 
        })
        .eq('id', client.id);
      
      if (updateError) {
        console.error('Error updating telegram data on client:', updateError);
      } else {
        console.log('handleOutgoingMessage: Updated telegram data on client:', client.id);
      }
    }
  }

  // PRIORITY 3: Search in client_phone_numbers table
  if (!client && contactPhone && contactPhone.length >= 10) {
    const phoneLast10 = contactPhone.slice(-10);
    console.log('handleOutgoingMessage: Searching in client_phone_numbers:', phoneLast10);
    
    const { data: phoneRecords, error: phoneRecordError } = await supabase
      .from('client_phone_numbers')
      .select('client_id')
      .ilike('phone', `%${phoneLast10}%`)
      .limit(1);

    if (phoneRecordError) {
      console.error('Error finding phone record:', phoneRecordError);
    } else if (phoneRecords && phoneRecords.length > 0) {
      const { data: foundClient, error: foundError } = await supabase
        .from('clients')
        .select('id')
        .eq('id', phoneRecords[0].client_id)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (foundError) {
        console.error('Error finding client by phone record:', foundError);
      } else if (foundClient) {
        client = foundClient;
        console.log('handleOutgoingMessage: Found client via client_phone_numbers:', client.id);
        
        // Update telegram data
        await supabase
          .from('clients')
          .update({ 
            telegram_chat_id: chatId, 
            telegram_user_id: telegramUserId 
          })
          .eq('id', client.id);
      }
    }
  }

  // PRIORITY 4: Create new client if not found
  if (!client) {
    const clientName = contactName || contactUsername || `Telegram ${chatId}`;
    console.log('handleOutgoingMessage: Creating new client:', clientName);
    
    const { data: newClient, error: createError } = await supabase
      .from('clients')
      .insert({
        organization_id: organizationId,
        name: clientName,
        telegram_chat_id: chatId,
        telegram_user_id: telegramUserId,
        phone: contactPhone ? `+${contactPhone}` : null,
        // Note: is_active removed - column doesn't exist on self-hosted
      })
      .select('id')
      .single();

    if (createError) {
      console.error('Error creating client for outgoing message:', createError);
      return;
    }
    client = newClient;
    console.log('handleOutgoingMessage: Created new client:', client.id);
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

  // IMPORTANT: Mark all unread messages from this client as read
  // When manager responds (even from phone), all previous messages should be considered read
  const { error: markReadError, count: markedCount } = await supabase
    .from('chat_messages')
    .update({ is_read: true })
    .eq('client_id', client.id)
    .eq('is_read', false);

  if (markReadError) {
    console.error('Error marking messages as read:', markReadError);
  } else if (markedCount && markedCount > 0) {
    console.log(`Marked ${markedCount} messages as read for client:`, client.id);
  }

  // Save outgoing message - message_type is 'manager' for outgoing
  // Use resilient insert for self-hosted compatibility
  const outgoingPayload = {
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
    created_at: message.timestamp || new Date().toISOString()
  };

  const { error: outgoingError } = await resilientInsertMessage(supabase, outgoingPayload);
  
  if (outgoingError) {
    console.error('Error saving outgoing message:', outgoingError);
    return;
  }

  console.log('Outgoing message saved for client:', client.id);
}

async function handleDeliveryStatus(supabase: any, message: TelegramWappiMessage): Promise<void> {
  console.log('Processing Telegram delivery status:', JSON.stringify(message, null, 2));
  
  // Wappi.pro sends delivery status with message id reference
  const status = (message.body || message.status)?.toString().toLowerCase();
  const messageIdToUpdate = message.stanza_id || message.id;
  
  if (!messageIdToUpdate) {
    console.error('No message ID found in delivery status webhook');
    return;
  }

  // Map status values
  const statusMap: Record<string, string> = {
    'sent': 'sent',
    'delivered': 'delivered',
    'read': 'read',
    'viewed': 'read',
    'played': 'read',
    'failed': 'failed',
    'error': 'failed'
  };

  const mappedStatus = statusMap[status || ''] || status;
  
  if (!mappedStatus) {
    console.log('Unknown delivery status:', message.body);
    return;
  }

  console.log(`Updating Telegram message ${messageIdToUpdate} status to: ${mappedStatus}`);

  // Update message status in database
  const { error, count } = await supabase
    .from('chat_messages')
    .update({ status: mappedStatus })
    .eq('external_message_id', messageIdToUpdate);

  if (error) {
    console.error('Error updating Telegram message status:', error);
  } else {
    console.log(`Updated ${count || 0} Telegram message(s) status to ${mappedStatus}`);
  }
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
  
  // Deactivate duplicate client (soft delete) - use status instead of is_active for self-hosted
  // Note: update may fail on self-hosted if is_active column doesn't exist, that's OK
  await supabase
    .from('clients')
    .update({ 
      status: 'merged',
      notes: `Объединён с клиентом. Старые данные: telegram_chat_id=${telegramChatId}`
    })
    .eq('id', duplicateClientId);
  
  console.log('Client merge completed');
}

interface ClientResult {
  id: string;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
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
): Promise<ClientResult | null> {
  const { organizationId, telegramUserId, telegramChatId, name, username, avatarUrl, phoneNumber } = params;

  console.log('findOrCreateClient called with:', { organizationId, telegramUserId, telegramChatId, name, username, avatarUrl, phoneNumber });

  // If we don't have telegramUserId, we cannot use the atomic RPC function
  // Fall back to legacy behavior (which has race condition risk, but is rare for null user_id)
  if (!telegramUserId) {
    console.log('No telegramUserId provided, using legacy findOrCreateClient');
    return await findOrCreateClientLegacy(supabase, params);
  }

  // Determine final name - if name looks like phone number, use username instead
  const phoneFromName = name?.replace(/\D/g, '');
  let finalName = name;
  if (phoneFromName && phoneFromName.length >= 10 && name.replace(/\D/g, '') === phoneFromName) {
    finalName = username ? `@${username}` : `Telegram ${telegramUserId}`;
  }

  // Determine final phone
  let finalPhone: string | null = null;
  if (phoneNumber && phoneNumber.length >= 10) {
    finalPhone = phoneNumber;
  } else if (phoneFromName && phoneFromName.length >= 10 && phoneFromName.length <= 15) {
    finalPhone = phoneFromName;
  }

  // Use atomic RPC function with advisory lock to prevent race conditions
  // This serializes all findOrCreate operations for the same (org_id, telegram_user_id)
  const { data: clientId, error: rpcError } = await supabase.rpc('find_or_create_telegram_client', {
    p_org_id: organizationId,
    p_telegram_user_id: telegramUserId,
    p_telegram_chat_id: telegramChatId,
    p_name: finalName,
    p_username: username || null,
    p_avatar_url: avatarUrl || null,
    p_phone: finalPhone
  });

  if (rpcError) {
    console.error('Error calling find_or_create_telegram_client RPC:', rpcError);
    // Fall back to legacy on RPC error
    return await findOrCreateClientLegacy(supabase, params);
  }

  if (!clientId) {
    console.error('RPC returned null client_id');
    return null;
  }

  // Fetch full client data for push notification formatting
  const { data: clientData, error: fetchError } = await supabase
    .from('clients')
    .select('id, name, first_name, last_name, avatar_url')
    .eq('id', clientId)
    .single();

  if (fetchError || !clientData) {
    console.error('Error fetching client data after RPC:', fetchError);
    return { id: clientId, name: finalName };
  }

  console.log('findOrCreateClient via RPC returned client:', clientId);
  return clientData as ClientResult;
}

// Legacy findOrCreateClient function - kept for fallback when telegramUserId is null
async function findOrCreateClientLegacy(
  supabase: any,
  params: {
    organizationId: string;
    telegramUserId: number | null;
    telegramChatId: string;
    name: string;
    username?: string;
    avatarUrl?: string | null;
    phoneNumber?: string | null;
  }
): Promise<ClientResult | null> {
  const { organizationId, telegramUserId, telegramChatId, name, username, avatarUrl, phoneNumber } = params;

  console.log('findOrCreateClientLegacy called with:', { organizationId, telegramChatId, name });

  // Helper function to update client with avatar
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

  // Try to find by telegram_chat_id (since we don't have telegram_user_id)
  const { data: clientByChatId } = await supabase
    .from('clients')
    .select('id, name, first_name, last_name, avatar_url')
    .eq('organization_id', organizationId)
    .eq('telegram_chat_id', telegramChatId)
    .limit(1);

  if (clientByChatId && clientByChatId.length > 0) {
    console.log('Found client by telegram_chat_id:', clientByChatId[0].id);
    await updateClientData(clientByChatId[0].id, { telegram_user_id: telegramUserId });
    return clientByChatId[0] as ClientResult;
  }

  // Try to find by phone if provided
  if (phoneNumber) {
    const phoneLast10 = phoneNumber.slice(-10);
    const { data: clientByPhone } = await supabase
      .from('clients')
      .select('id, name, first_name, last_name, avatar_url')
      .eq('organization_id', organizationId)
      .ilike('phone', `%${phoneLast10}%`)
      .limit(1);

    if (clientByPhone && clientByPhone.length > 0) {
      console.log('Found client by phone:', clientByPhone[0].id);
      await updateClientData(clientByPhone[0].id, {
        telegram_chat_id: telegramChatId,
        telegram_user_id: telegramUserId
      });
      return clientByPhone[0] as ClientResult;
    }
  }

  // Create new client
  const phoneFromName = name?.replace(/\D/g, '');
  let finalName = name;
  let finalPhone: string | null = null;
  
  if (phoneNumber && phoneNumber.length >= 10) {
    finalPhone = `+${phoneNumber}`;
  } else if (phoneFromName && phoneFromName.length >= 10 && phoneFromName.length <= 15) {
    finalPhone = `+${phoneFromName}`;
  }

  if (phoneFromName && phoneFromName.length >= 10 && name.replace(/\D/g, '') === phoneFromName) {
    finalName = username ? `@${username}` : `Telegram User`;
  }

  console.log('Creating new client (legacy):', finalName);
  
  const { data: newClient, error: createError } = await supabase
    .from('clients')
    .insert({
      organization_id: organizationId,
      name: finalName,
      telegram_user_id: telegramUserId,
      telegram_chat_id: telegramChatId,
      // Note: telegram_avatar_url and is_active removed - may not exist on self-hosted
      phone: finalPhone,
      notes: username ? `@${username}` : null,
    })
    .select('id, name, first_name, last_name, avatar_url')
    .single();

  if (createError) {
    console.error('Error creating client (legacy):', createError);
    return null;
  }

  console.log('Created new client (legacy):', newClient.id);
  return newClient as ClientResult;
}

function extractMessageContent(message: TelegramWappiMessage): {
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

// Enrich client data from Telegram contact info
async function enrichClientFromTelegram(
  supabase: any,
  clientId: string,
  contactData: {
    contactName?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
    phoneNumber?: string | null;
  }
): Promise<void> {
  if (!clientId) return;

  try {
    // Get current client data - including first_name/last_name to check for structured names
    const { data: currentClient, error: fetchError } = await supabase
      .from('clients')
      .select('name, first_name, last_name, phone, avatar_url, telegram_avatar_url, holihope_metadata')
      .eq('id', clientId)
      .single();

    if (fetchError || !currentClient) {
      console.log('Client not found for Telegram enrichment:', clientId);
      return;
    }

    const updateData: Record<string, any> = {};

    // CRITICAL: Check if client already has a proper structured name from CRM
    // If first_name or last_name is set - DO NOT overwrite from Telegram
    const hasStructuredName = (currentClient.first_name && currentClient.first_name.trim() !== '') || 
                              (currentClient.last_name && currentClient.last_name.trim() !== '');
    
    if (hasStructuredName) {
      console.log(`Client ${clientId} has structured name (${currentClient.first_name} ${currentClient.last_name}), skipping Telegram name enrichment`);
    }

    // Check if current name is auto-generated (only relevant if no structured name)
    const currentName = currentClient.name || '';
    const isAutoName = !hasStructuredName && (currentName === 'Без имени' ||
                       currentName.startsWith('Клиент ') || 
                       currentName.startsWith('+') || 
                       /^\d+$/.test(currentName) ||
                       currentName.includes('@c.us') ||
                       currentName.startsWith('MAX User') ||
                       currentName.startsWith('Telegram ') ||
                       currentName.startsWith('User ') ||
                       currentName.startsWith('@'));
    // Build final name from contact data
    const { contactName, username } = contactData;
    let finalName: string | null = null;
    
    if (contactName && contactName !== 'Без имени') {
      // Check if contactName looks like a phone number
      const phoneCheck = contactName.replace(/\D/g, '');
      if (!(phoneCheck && phoneCheck.length >= 10 && contactName.replace(/\D/g, '') === phoneCheck)) {
        finalName = contactName;
      }
    }
    
    // If no good name from contactName, try username
    if (!finalName && username) {
      finalName = `@${username}`;
    }

    // Update name only if we have a good name and current name is auto-generated
    if (finalName && isAutoName) {
      updateData.name = finalName;
      console.log(`Updating Telegram client name from "${currentName}" to "${finalName}"`);
    }

    // Update phone if missing
    if (contactData.phoneNumber && !currentClient.phone) {
      const formattedPhone = String(contactData.phoneNumber).startsWith('+') 
        ? contactData.phoneNumber 
        : `+${contactData.phoneNumber}`;
      updateData.phone = formattedPhone;
      console.log(`Setting Telegram client phone to "${formattedPhone}"`);
    }

    // Update avatar if provided
    if (contactData.avatarUrl) {
      updateData.telegram_avatar_url = contactData.avatarUrl;
      // Also update main avatar if missing
      if (!currentClient.avatar_url) {
        updateData.avatar_url = contactData.avatarUrl;
      }
    }

    // Save additional info to metadata
    const existingMetadata = (currentClient.holihope_metadata as Record<string, any>) || {};
    const telegramInfo = existingMetadata.telegram_info || {};

    const newTelegramInfo: Record<string, any> = {
      ...telegramInfo,
      last_updated: new Date().toISOString()
    };

    if (contactData.contactName) newTelegramInfo.name = contactData.contactName;
    if (contactData.username) newTelegramInfo.username = contactData.username;
    if (contactData.phoneNumber) newTelegramInfo.phone = contactData.phoneNumber;
    if (contactData.avatarUrl) newTelegramInfo.avatar_url = contactData.avatarUrl;

    updateData.holihope_metadata = {
      ...existingMetadata,
      telegram_info: newTelegramInfo
    };

    // Update client if there are changes
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', clientId);

      if (updateError) {
        console.error('Error enriching Telegram client data:', updateError);
      } else {
        console.log(`Telegram client ${clientId} enriched with:`, Object.keys(updateData));
      }
    }
  } catch (error) {
    console.error('Error in enrichClientFromTelegram:', error);
  }
}

// Helper function to update messenger data in client_phone_numbers
async function updatePhoneNumberMessengerData(
  supabase: any,
  clientId: string,
  data: {
    phone?: string | null;
    telegramChatId?: string | null;
    telegramUserId?: number | null;
    telegramAvatarUrl?: string | null;
    whatsappChatId?: string | null;
    whatsappAvatarUrl?: string | null;
    maxChatId?: string | null;
    maxUserId?: number | null;
    maxAvatarUrl?: string | null;
  }
): Promise<void> {
  if (!data.phone && !data.telegramChatId && !data.whatsappChatId && !data.maxChatId) {
    return;
  }

  try {
    // Find matching phone number in client_phone_numbers
    let phoneRecord = null;
    
    if (data.phone) {
      const cleanPhone = data.phone.replace(/\D/g, '');
      if (cleanPhone.length >= 10) {
        const { data: records } = await supabase
          .from('client_phone_numbers')
          .select('id, phone')
          .eq('client_id', clientId)
          .or(`phone.ilike.%${cleanPhone}%,phone.ilike.%${cleanPhone.slice(-10)}%`)
          .limit(1);
        
        phoneRecord = records?.[0];
      }
    }
    
    // If no match by phone, try to find primary number
    if (!phoneRecord) {
      const { data: primaryRecord } = await supabase
        .from('client_phone_numbers')
        .select('id')
        .eq('client_id', clientId)
        .eq('is_primary', true)
        .single();
      
      phoneRecord = primaryRecord;
    }
    
    if (!phoneRecord) {
      console.log('No phone number record found to update messenger data');
      return;
    }

    const updateData: Record<string, any> = {};
    
    if (data.telegramChatId) updateData.telegram_chat_id = data.telegramChatId;
    if (data.telegramUserId) updateData.telegram_user_id = data.telegramUserId;
    if (data.telegramAvatarUrl) updateData.telegram_avatar_url = data.telegramAvatarUrl;
    if (data.whatsappChatId) updateData.whatsapp_chat_id = data.whatsappChatId;
    if (data.whatsappAvatarUrl) updateData.whatsapp_avatar_url = data.whatsappAvatarUrl;
    if (data.maxChatId) updateData.max_chat_id = data.maxChatId;
    if (data.maxUserId) updateData.max_user_id = data.maxUserId;
    if (data.maxAvatarUrl) updateData.max_avatar_url = data.maxAvatarUrl;

    if (Object.keys(updateData).length > 0) {
      await supabase
        .from('client_phone_numbers')
        .update(updateData)
        .eq('id', phoneRecord.id);
      
      console.log(`Updated messenger data for phone record ${phoneRecord.id}:`, Object.keys(updateData));
    }

    // Also sync teacher data if this client is linked to a teacher
    await syncTeacherFromClient(supabase, clientId, data);
  } catch (error) {
    console.error('Error updating phone number messenger data:', error);
  }
}

// Sync teacher phone and telegram_user_id from client data
async function syncTeacherFromClient(
  supabase: any,
  clientId: string,
  data: {
    phone?: string | null;
    telegramUserId?: number | null;
  }
): Promise<void> {
  if (!data.phone && !data.telegramUserId) {
    return;
  }

  try {
    // Check if this client is linked to a teacher
    const { data: teacherLink, error: linkError } = await supabase
      .from('teacher_client_links')
      .select('teacher_id')
      .eq('client_id', clientId)
      .maybeSingle();

    if (linkError || !teacherLink) {
      return;
    }

    const teacherId = teacherLink.teacher_id;

    // Get current teacher data
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('phone, telegram_user_id')
      .eq('id', teacherId)
      .single();

    if (teacherError || !teacher) {
      console.error('Teacher not found:', teacherId);
      return;
    }

    const updateData: Record<string, any> = {};

    // Update phone if teacher doesn't have one or if we have a new valid phone
    if (data.phone) {
      const cleanPhone = data.phone.replace(/\D/g, '');
      if (cleanPhone.length >= 10 && cleanPhone.length <= 15) {
        // Format as +7XXXXXXXXXX for Russian numbers
        let formattedPhone = cleanPhone;
        if (cleanPhone.length === 10) {
          formattedPhone = `+7${cleanPhone}`;
        } else if (cleanPhone.length === 11 && (cleanPhone.startsWith('7') || cleanPhone.startsWith('8'))) {
          formattedPhone = `+7${cleanPhone.slice(1)}`;
        } else {
          formattedPhone = `+${cleanPhone}`;
        }

        // Only update if teacher has no phone
        if (!teacher.phone) {
          updateData.phone = formattedPhone;
        }
      }
    }

    // Update telegram_user_id if teacher doesn't have one
    if (data.telegramUserId && !teacher.telegram_user_id) {
      updateData.telegram_user_id = String(data.telegramUserId);
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('teachers')
        .update(updateData)
        .eq('id', teacherId);

      if (updateError) {
        console.error('Error updating teacher data:', updateError);
      } else {
        console.log(`Synced teacher ${teacherId} data from client ${clientId}:`, updateData);
      }
    }
  } catch (error) {
    console.error('Error syncing teacher from client:', error);
  }
}
