import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1'
import {
  corsHeaders,
  handleCors,
  getErrorMessage,
  sendPushNotification,
  getOrgAdminManagerUserIds,
  type WappiWebhook,
  type WappiMessage,
} from '../_shared/types.ts'

console.log('wappi-whatsapp-webhook function booted')

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// ============================================================================
// Media upload helper
// ============================================================================

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/3gpp': '.3gp',
  'audio/ogg': '.ogg',
  'audio/ogg; codecs=opus': '.ogg',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-excel': '.xls',
}

function getExtFromMime(mime: string | undefined): string {
  if (!mime) return '.bin'
  // Handle mimes with parameters like "audio/ogg; codecs=opus"
  const clean = mime.split(';')[0].trim().toLowerCase()
  return MIME_TO_EXT[clean] || MIME_TO_EXT[mime] || `.${clean.split('/')[1] || 'bin'}`
}

function generateFileName(mime: string | undefined, messageId: string): string {
  const ext = getExtFromMime(mime)
  const typeLabel = mime?.startsWith('image') ? 'image'
    : mime?.startsWith('video') ? 'video'
    : mime?.startsWith('audio') ? 'audio'
    : 'file'
  return `${typeLabel}_${messageId.slice(-8)}${ext}`
}

async function uploadWappiMedia(
  base64Body: string,
  messageId: string,
  mimeType: string | undefined,
  orgId: string
): Promise<string | null> {
  try {
    // Decode base64 to binary
    const binaryString = atob(base64Body)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    const ext = getExtFromMime(mimeType)
    const contentType = mimeType?.split(';')[0].trim() || 'application/octet-stream'
    const storagePath = `wappi/${orgId}/${messageId}${ext}`

    console.log(`[wappi-media] Uploading ${bytes.length} bytes to chat-media/${storagePath}`)

    const { error: uploadError } = await supabase.storage
      .from('chat-media')
      .upload(storagePath, bytes, {
        contentType,
        upsert: true,
      })

    if (uploadError) {
      console.error('[wappi-media] Upload error:', uploadError.message)
      return null
    }

    const { data: publicUrlData } = supabase.storage
      .from('chat-media')
      .getPublicUrl(storagePath)

    console.log('[wappi-media] Uploaded successfully:', publicUrlData.publicUrl)
    return publicUrlData.publicUrl
  } catch (err) {
    console.error('[wappi-media] Failed to upload:', err)
    return null
  }
}

function extractPhoneFromChatId(chatId: string): string {
  // chatId format: 79999999999@c.us or group format
  return chatId.replace('@c.us', '').replace('@g.us', '')
}

async function resolveOrganizationIdFromWebhook(profileId: string): Promise<string | null> {
  console.log('Resolving organization for Wappi profileId:', profileId)

  if (!profileId) {
    console.error('No profileId in webhook')
    return null
  }

  // First try messenger_integrations table (new multi-account system)
  try {
    const { data: integration, error: intError } = await supabase
      .from('messenger_integrations')
      .select('organization_id, is_enabled, settings')
      .eq('messenger_type', 'whatsapp')
      .eq('provider', 'wappi')
      .eq('is_enabled', true)
      .order('updated_at', { ascending: false })

    if (!intError && integration && integration.length > 0) {
      for (const int of integration) {
        const settingsObj = int.settings as Record<string, unknown> | null
        const storedProfileId = settingsObj?.wappiProfileId || settingsObj?.profileId
        if (String(storedProfileId) === String(profileId)) {
          console.log('Found organization in messenger_integrations:', int.organization_id)
          return int.organization_id as string
        }
      }
    }
  } catch (e) {
    console.warn('messenger_integrations lookup failed, trying messenger_settings:', e)
  }

  // Fallback to messenger_settings table
  // IMPORTANT: Self-hosted schema may not have 'provider' column, so we search by settings->>'wappiProfileId'
  try {
    const { data, error } = await supabase
      .from('messenger_settings')
      .select('organization_id, settings, is_enabled')
      .eq('messenger_type', 'whatsapp')
      .eq('is_enabled', true)
      .not('organization_id', 'is', null)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching messenger_settings:', error)
      return null
    }

    if (!data || data.length === 0) {
      console.warn('No WhatsApp settings found in messenger_settings')
      return null
    }

    // Search through settings to find matching profileId (wappiProfileId or profileId)
    for (const setting of data) {
      const settingsObj = setting.settings as Record<string, unknown> | null
      const storedProfileId = settingsObj?.wappiProfileId || settingsObj?.profileId

      if (String(storedProfileId) === String(profileId)) {
        console.log('Found organization by profileId in messenger_settings:', setting.organization_id)
        return setting.organization_id as string
      }
    }

    console.warn('No organization found for profileId:', profileId)
    return null
  } catch (e) {
    console.error('Error in resolveOrganizationIdFromWebhook:', e)
    return null
  }
}

async function findOrCreateClient(phoneNumber: string, senderName: string | undefined, organizationId: string) {
  // First check by phone in client_phone_numbers table
  const { data: phoneData } = await supabase
    .from('client_phone_numbers')
    .select('client_id, clients!inner(id, name, first_name, last_name, organization_id)')
    .eq('phone', phoneNumber)
    .limit(1)
    .maybeSingle()

  if (phoneData?.client_id) {
    const clientData = phoneData.clients as any;
    console.log('Found client by phone number:', phoneData.client_id)
    return { 
      id: phoneData.client_id, 
      name: clientData?.name,
      first_name: clientData?.first_name,
      last_name: clientData?.last_name
    }
  }

  // Try to find by whatsapp_chat_id
  const chatId = `${phoneNumber}@c.us`
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id, name, first_name, last_name')
    .eq('whatsapp_chat_id', chatId)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (existingClient) {
    console.log('Found client by whatsapp_chat_id:', existingClient.id)
    return existingClient
  }

  // Try to find by phone field directly
  const { data: clientByPhone } = await supabase
    .from('clients')
    .select('id, name, first_name, last_name')
    .eq('phone', phoneNumber)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (clientByPhone) {
    // Update whatsapp_chat_id
    await supabase
      .from('clients')
      .update({ whatsapp_chat_id: chatId })
      .eq('id', clientByPhone.id)

    console.log('Found client by phone, updated whatsapp_chat_id:', clientByPhone.id)
    return clientByPhone
  }

  // Create new client
  const clientName = senderName || `WhatsApp ${phoneNumber}`
  const { data: newClient, error: createError } = await supabase
    .from('clients')
    .insert({
      name: clientName,
      phone: phoneNumber,
      whatsapp_chat_id: chatId,
      organization_id: organizationId,
      is_active: true
    })
    .select('id, name, first_name, last_name')
    .single()

  if (createError) {
    // Handle unique constraint — find and restore deactivated client
    if (createError.code === '23505') {
      console.log('[wappi-webhook] Unique constraint hit, searching for existing client')
      const { data: conflictClient } = await supabase
        .from('clients')
        .select('id, name, first_name, last_name')
        .eq('organization_id', organizationId)
        .eq('whatsapp_chat_id', chatId)
        .maybeSingle()
      
      if (conflictClient) {
        await supabase
          .from('clients')
          .update({ is_active: true })
          .eq('id', conflictClient.id)
        console.log('[wappi-webhook] Restored client after constraint:', conflictClient.id)
        return conflictClient
      }
    }
    console.error('Error creating client:', createError)
    throw createError
  }

  // Also create phone number record (table may not exist on self-hosted)
  try {
    await supabase
      .from('client_phone_numbers')
      .insert({
        client_id: newClient.id,
        phone: phoneNumber,
        is_primary: true,
        is_whatsapp_enabled: true,
        whatsapp_chat_id: chatId
      })
  } catch (phoneErr) {
    console.warn('[wappi-webhook] Could not insert into client_phone_numbers (table may not exist):', phoneErr)
  }

  console.log('Created new client:', newClient.id)
  return newClient
}

function getMessageTypeDescription(type: string, mimeType?: string): string {
  switch (type) {
    case 'chat':
      return 'text'
    case 'image':
      return '📷 Изображение'
    case 'video':
      return '🎥 Видео'
    case 'ptt':
      return '🎙️ Голосовое сообщение'
    case 'audio':
      return '🎵 Аудиофайл'
    case 'document':
      return '📄 Документ'
    case 'vcard':
      return '👤 Контакт'
    case 'location':
      return '📍 Местоположение'
    case 'reaction':
      return '👍 Реакция'
    default:
      return `[${type}]`
  }
}

function getFileType(messageType: string, mimeType?: string): string | null {
  switch (messageType) {
    case 'image':
      return 'image'
    case 'video':
      return 'video'
    case 'ptt':
    case 'audio':
      return 'audio'
    case 'document':
      return 'document'
    default:
      return null
  }
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const webhook: WappiWebhook = await req.json()
    console.log('Received Wappi webhook:', JSON.stringify(webhook, null, 2))

    if (!webhook.messages || webhook.messages.length === 0) {
      console.log('No messages in webhook')
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const message = webhook.messages[0]
    const profileId = message.profile_id

    // Resolve organization from profileId
    const organizationId = await resolveOrganizationIdFromWebhook(profileId)
    console.log('Resolved organization_id:', organizationId)

    // Save webhook to log (optional - may not exist on self-hosted)
    try {
      await supabase.from('webhook_logs').insert({
        messenger_type: 'whatsapp',
        event_type: message.wh_type,
        webhook_data: webhook,
        processed: false
      })
    } catch (logError) {
      // Ignore logging errors - table may not exist on self-hosted
      console.warn('Could not save webhook log (table may not exist):', logError)
    }

    // Process different webhook types
    switch (message.wh_type) {
      case 'incoming_message':
        await handleIncomingMessage(message, organizationId)
        break

      case 'outgoing_message_api':
      case 'outgoing_message_phone':
        await handleOutgoingMessage(message, organizationId)
        break

      case 'delivery_status':
        await handleDeliveryStatus(message)
        break

      default:
        console.log(`Unhandled Wappi webhook type: ${message.wh_type}`)
    }

    // Mark webhook as processed (optional - may not exist on self-hosted)
    try {
      await supabase
        .from('webhook_logs')
        .update({ processed: true })
        .eq('webhook_data->messages->0->>id', message.id)
        .eq('webhook_data->messages->0->>wh_type', message.wh_type)
    } catch (updateError) {
      // Ignore - table may not exist
      console.warn('Could not update webhook log:', updateError)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: unknown) {
    console.error('Error processing Wappi webhook:', error)

    try {
      await supabase.from('webhook_logs').insert({
        messenger_type: 'whatsapp',
        event_type: 'error',
        webhook_data: { error: getErrorMessage(error) },
        processed: false,
        error_message: getErrorMessage(error)
      })
    } catch (logError) {
      console.error('Error saving error log:', logError)
    }

    // IMPORTANT: Return 200 OK even on errors to prevent retry storms from Wappi
    // The error is logged above for debugging
    return new Response(JSON.stringify({ success: true, status: 'error_logged', error: getErrorMessage(error) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function handleIncomingMessage(message: WappiMessage, organizationId: string | null) {
  if (!organizationId) {
    console.error('Cannot process incoming message: organization_id not resolved from profileId')
    throw new Error('Organization not found for this Wappi profile')
  }

  const phoneNumber = extractPhoneFromChatId(message.from)
  
  // Check for duplicate message first
  const { data: existingMsg } = await supabase
    .from('chat_messages')
    .select('id')
    .eq('external_message_id', message.id)
    .maybeSingle()

  if (existingMsg) {
    console.log('Duplicate message, skipping:', message.id)
    return
  }

  // Handle edited messages (is_edited=true, stanza_id=original message ID)
  const wappiMsg = message as any
  if (wappiMsg.is_edited && wappiMsg.stanza_id) {
    console.log('[wappi-webhook] Edited message received, stanza_id:', wappiMsg.stanza_id)
    const newText = wappiMsg.body || ''
    const { error: editError } = await supabase
      .from('chat_messages')
      .update({
        message_text: newText,
        metadata: {
          is_edited: true,
          edited_at: wappiMsg.timestamp || new Date(wappiMsg.time * 1000).toISOString(),
        },
      })
      .eq('external_message_id', wappiMsg.stanza_id)
    if (editError) {
      console.error('[wappi-webhook] Error updating edited message:', editError)
    } else {
      console.log('[wappi-webhook] ✓ Message edited in DB, stanza_id:', wappiMsg.stanza_id)
    }
    return // Don't insert as new message
  }

  // Determine message text and file info
  let messageText = ''
  let fileUrl: string | null = null
  let fileName: string | null = null
  let fileType: string | null = null

  if (message.type === 'chat') {
    messageText = message.body || ''
  } else if (message.type === 'reaction') {
    messageText = `${message.body} (реакция)`
    return // Skip saving reactions as separate messages for now
  } else {
    messageText = message.caption || getMessageTypeDescription(message.type, message.mimetype)
    fileName = message.file_name || message.title || generateFileName(message.mimetype, message.id)
    fileType = message.mimetype || null

    // Upload base64 media to Supabase Storage
    if (message.body && message.type !== 'chat' && organizationId) {
      const uploadedUrl = await uploadWappiMedia(message.body, message.id, message.mimetype, organizationId)
      fileUrl = uploadedUrl
      if (!uploadedUrl) {
        console.warn('[wappi-webhook] Media upload failed for message:', message.id)
      }
    }
  }

  // PRIORITY 1: Check if sender is a TEACHER by whatsapp_id
  const { data: teacherData } = await supabase
    .from('teachers')
    .select('id, first_name, last_name')
    .eq('organization_id', organizationId)
    .eq('whatsapp_id', phoneNumber)
    .eq('is_active', true)
    .maybeSingle()

  if (teacherData) {
    console.log('[wappi-webhook] Found teacher by whatsapp_id:', teacherData.id)
    
    // Save message with teacher_id (not client_id)
    const { error } = await supabase.from('chat_messages').insert({
      client_id: null,
      organization_id: organizationId,
      message_text: messageText,
      message_type: 'client',
      messenger_type: 'whatsapp',
      message_status: 'delivered',
      external_message_id: message.id,
      is_outgoing: false,
      is_read: false,
      file_url: fileUrl,
      file_name: fileName,
      file_type: fileType,
      metadata: { teacher_id: teacherData.id },
      created_at: message.timestamp || new Date(message.time * 1000).toISOString()
    })

    if (error) {
      console.error('Error saving teacher message:', error)
      throw error
    }

    console.log(`[wappi-webhook] Saved message for TEACHER ${teacherData.id}`)
    return // Exit early - don't create client
  }

  // PRIORITY 2: Normal client flow (not a teacher)
  const client = await findOrCreateClient(phoneNumber, message.senderName, organizationId)

  // Save message to database
  const { error } = await supabase.from('chat_messages').insert({
    client_id: client.id,
    organization_id: organizationId,
    message_text: messageText,
    message_type: 'client',
    messenger_type: 'whatsapp',
    message_status: 'delivered',
    external_message_id: message.id,
    is_outgoing: false,
    is_read: false,
    file_url: fileUrl,
    file_name: fileName,
    file_type: fileType,
    created_at: message.timestamp || new Date(message.time * 1000).toISOString()
  })

  if (error) {
    console.error('Error saving incoming message:', error)
    throw error
  }

  // Update client's last message timestamp
  await supabase
    .from('clients')
    .update({
      last_message_at: message.timestamp || new Date(message.time * 1000).toISOString(),
      whatsapp_chat_id: message.chatId
    })
    .eq('id', client.id)

  // Update phone number record
  await supabase
    .from('client_phone_numbers')
    .update({
      whatsapp_chat_id: message.chatId,
      is_whatsapp_enabled: true
    })
    .eq('client_id', client.id)
    .eq('phone', phoneNumber)

  console.log(`Saved incoming Wappi message from ${phoneNumber}: ${messageText}`)

  // Sync teacher data if this client is linked to a teacher
  await syncTeacherFromClient(supabase, client.id, {
    phone: phoneNumber,
    whatsappId: phoneNumber
  });

  // Send push notifications to managers/admins in this organization
  try {
    const userIds = await getOrgAdminManagerUserIds(supabase, organizationId);

    if (userIds.length > 0) {
      // Format: "Имя Фамилия" as title, message text as body
      const clientFullName = [client.first_name, client.last_name]
        .filter(Boolean).join(' ') || client.name || 'Клиент';
      
      const pushResult = await sendPushNotification({
        userIds,
        payload: {
          title: '💬 WhatsApp',
          body: `${clientFullName}: ${messageText.slice(0, 80)}${messageText.length > 80 ? '...' : ''}`,
          icon: client.avatar_url || '/pwa-192x192.png',
          url: `/newcrm?clientId=${client.id}`,
          tag: `whatsapp-${client.id}-${Date.now()}`,
        },
      });
      console.log('Push notification sent for WhatsApp message to', userIds.length, 'users in org:', organizationId, 'result:', pushResult);
      
      // Log push result for diagnostics
      supabase.from('webhook_logs').insert({
        messenger_type: 'push-diagnostic',
        event_type: 'whatsapp-push-sent',
        webhook_data: {
          clientId: client.id,
          organizationId,
          userIds,
          pushResult,
          timestamp: new Date().toISOString(),
        },
        processed: true
      }).then(({ error }) => {
        if (error) console.error('[wappi-webhook] Failed to log push result:', error)
      });
    }
  } catch (pushErr) {
    console.error('Error sending push notification:', pushErr);
  }

  // Trigger delayed GPT response
  setTimeout(async () => {
    try {
      const { data: gptResult, error: gptError } = await supabase.functions.invoke('generate-delayed-gpt-response', {
        body: {
          clientId: client.id,
          maxWaitTimeMs: 30000
        }
      })

      if (gptError) {
        console.error('Error generating delayed GPT response:', gptError)
      } else {
        console.log('Delayed GPT response generated:', gptResult)
      }
    } catch (error) {
      console.error('Error triggering delayed GPT response:', error)
    }
  }, 500)
}

async function handleOutgoingMessage(message: WappiMessage, organizationId: string | null) {
  if (!organizationId) {
    console.error('Cannot process outgoing message: organization_id not resolved')
    return
  }

  console.log(`Processing outgoing Wappi message: ${message.id}`)

  // Check for duplicate - message might have been sent via CRM
  const { data: existingMessage } = await supabase
    .from('chat_messages')
    .select('id')
    .eq('external_message_id', message.id)
    .maybeSingle()

  if (existingMessage) {
    console.log('Outgoing message already exists (sent via CRM), skipping:', message.id)
    return
  }

  // Handle edited outgoing messages
  const outMsg = message as any
  if (outMsg.is_edited && outMsg.stanza_id) {
    console.log('[wappi-webhook] Edited outgoing message, stanza_id:', outMsg.stanza_id)
    const newText = outMsg.body || ''
    const { error: editError } = await supabase
      .from('chat_messages')
      .update({
        message_text: newText,
        metadata: {
          is_edited: true,
          edited_at: outMsg.timestamp || new Date(outMsg.time * 1000).toISOString(),
        },
      })
      .eq('external_message_id', outMsg.stanza_id)
    if (editError) {
      console.error('[wappi-webhook] Error updating edited outgoing message:', editError)
    } else {
      console.log('[wappi-webhook] ✓ Outgoing message edited in DB')
    }
    return
  }

  const phoneNumber = extractPhoneFromChatId(message.chatId)
  const client = await findOrCreateClient(phoneNumber, undefined, organizationId)

  let messageText = message.type === 'chat'
    ? message.body
    : (message.caption || getMessageTypeDescription(message.type))

  let fileUrl: string | null = null
  let fileName: string | null = null
  let fileType: string | null = null

  // Upload media for outgoing messages too
  if (message.type !== 'chat' && message.body && organizationId) {
    fileName = message.file_name || message.title || generateFileName(message.mimetype, message.id)
    fileType = message.mimetype || null
    const uploadedUrl = await uploadWappiMedia(message.body, message.id, message.mimetype, organizationId)
    fileUrl = uploadedUrl
  }

  // Save message as outgoing from manager
  const { error } = await supabase.from('chat_messages').insert({
    client_id: client.id,
    organization_id: organizationId,
    message_text: messageText,
    message_type: 'manager',
    messenger_type: 'whatsapp',
    message_status: 'sent',
    external_message_id: message.id,
    is_outgoing: true,
    is_read: true,
    file_url: fileUrl,
    file_name: fileName,
    file_type: fileType,
    created_at: message.timestamp || new Date(message.time * 1000).toISOString()
  })

  if (error) {
    console.error('Error saving outgoing message:', error)
  }

  // Mark previous unread messages as read
  await supabase
    .from('chat_messages')
    .update({ is_read: true })
    .eq('client_id', client.id)
    .eq('is_read', false)
    .eq('message_type', 'client')

  console.log(`Saved outgoing Wappi message to ${phoneNumber}: ${messageText}`)
}

async function handleDeliveryStatus(message: WappiMessage) {
  console.log('Processing delivery status:', JSON.stringify(message, null, 2))

  // Wappi sends status in body field: 'sent', 'delivered', 'read', 'failed'
  const status = message.body?.toLowerCase()
  const messageIdToUpdate = message.stanza_id || message.id
  
  if (!messageIdToUpdate) {
    console.error('No message ID found in delivery status webhook')
    return
  }

  // Map Wappi status to our status values
  const statusMap: Record<string, string> = {
    'sent': 'sent',
    'delivered': 'delivered',
    'read': 'read',
    'viewed': 'read',
    'played': 'read', // for voice messages
    'failed': 'failed',
    'error': 'failed'
  }

  const mappedStatus = statusMap[status || ''] || status
  
  if (!mappedStatus) {
    console.log('Unknown delivery status:', message.body)
    return
  }

  console.log(`Updating message ${messageIdToUpdate} status to: ${mappedStatus}`)

  // Update message status in database
  const { error, count } = await supabase
    .from('chat_messages')
    .update({ message_status: mappedStatus })
    .eq('external_message_id', messageIdToUpdate)

  if (error) {
    console.error('Error updating message status:', error)
  } else {
    console.log(`Updated ${count || 0} message(s) status to ${mappedStatus}`)
  }
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
  supabaseClient: ReturnType<typeof createClient>,
  clientId: string,
  data: {
    phone?: string | null;
    whatsappId?: string | null;
  }
): Promise<void> {
  try {
    // 1. Find link to teacher
    const { data: teacherLink, error: linkError } = await supabaseClient
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
    const { data: teacher, error: teacherError } = await supabaseClient
      .from('teachers')
      .select('phone, whatsapp_id')
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
    
    if (data.whatsappId && !teacher.whatsapp_id) {
      updateData.whatsapp_id = data.whatsappId;
    }

    // 4. Save if there are updates
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabaseClient
        .from('teachers')
        .update(updateData)
        .eq('id', teacherLink.teacher_id);

      if (updateError) {
        console.error('Error updating teacher:', updateError);
      } else {
        console.log(`Synced WhatsApp data to teacher ${teacherLink.teacher_id}:`, updateData);
      }
    } else {
      console.log('No new data to sync for teacher:', teacherLink.teacher_id);
    }
  } catch (error: unknown) {
    console.error('Error in syncTeacherFromClient:', getErrorMessage(error));
  }
}
