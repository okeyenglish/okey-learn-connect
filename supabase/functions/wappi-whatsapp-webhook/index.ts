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

  const { data, error } = await supabase
    .from('messenger_settings')
    .select('organization_id, settings')
    .eq('messenger_type', 'whatsapp')
    .eq('provider', 'wappi')
    .not('organization_id', 'is', null)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching messenger_settings:', error)
    return null
  }

  if (!data || data.length === 0) {
    console.warn('No Wappi settings found')
    return null
  }

  // Search through settings to find matching profileId
  for (const setting of data) {
    const settingsObj = setting.settings as Record<string, unknown> | null
    const storedProfileId = settingsObj?.wappiProfileId

    if (String(storedProfileId) === String(profileId)) {
      console.log('Found organization by profileId:', setting.organization_id)
      return setting.organization_id as string
    }
  }

  console.warn('No organization found for profileId:', profileId)
  return null
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
    console.error('Error creating client:', createError)
    throw createError
  }

  // Also create phone number record
  await supabase
    .from('client_phone_numbers')
    .insert({
      client_id: newClient.id,
      phone: phoneNumber,
      is_primary: true,
      is_whatsapp_enabled: true,
      whatsapp_chat_id: chatId
    })

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

    // Save webhook to log
    await supabase.from('webhook_logs').insert({
      messenger_type: 'whatsapp',
      event_type: message.wh_type,
      webhook_data: webhook,
      processed: false
    })

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

    // Mark webhook as processed
    await supabase
      .from('webhook_logs')
      .update({ processed: true })
      .eq('webhook_data->messages->0->>id', message.id)
      .eq('webhook_data->messages->0->>wh_type', message.wh_type)

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

    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
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
  const client = await findOrCreateClient(phoneNumber, message.senderName, organizationId)

  // Determine message text and file info
  let messageText = ''
  let fileUrl: string | null = null
  let fileName: string | null = null
  let fileType: string | null = null

  if (message.type === 'chat') {
    messageText = message.body || ''
  } else if (message.type === 'reaction') {
    // Handle reactions separately if needed
    messageText = `${message.body} (реакция)`
    return // Skip saving reactions as separate messages for now
  } else {
    // For media types, body contains base64 data
    // Caption contains the text message if any
    messageText = message.caption || getMessageTypeDescription(message.type, message.mimetype)
    fileName = message.file_name
    fileType = message.mimetype

    // For media messages, we may need to download the file
    // The body contains base64 data - we could save it to storage
    // For now, we'll store a placeholder and let the download function handle it
    if (message.body && message.type !== 'chat') {
      // Store marker that media is available
      fileUrl = `wappi://media/${message.id}`
    }
  }

  // Save message to database
  const { error } = await supabase.from('chat_messages').insert({
    client_id: client.id,
    organization_id: organizationId,
    message_text: messageText,
    message_type: 'client',
    messenger_type: 'whatsapp',
    status: 'delivered', // incoming messages are already delivered
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
      await supabase.from('webhook_logs').insert({
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
      }).catch((e: unknown) => console.error('[wappi-webhook] Failed to log push result:', e));
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

  const phoneNumber = extractPhoneFromChatId(message.chatId)
  const client = await findOrCreateClient(phoneNumber, undefined, organizationId)

  let messageText = message.type === 'chat'
    ? message.body
    : (message.caption || getMessageTypeDescription(message.type))

  // Save message as outgoing from manager
  const { error } = await supabase.from('chat_messages').insert({
    client_id: client.id,
    organization_id: organizationId,
    message_text: messageText,
    message_type: 'manager',
    messenger_type: 'whatsapp',
    status: 'sent', // outgoing message starts as sent, will be updated via delivery_status
    external_message_id: message.id,
    is_outgoing: true,
    is_read: true,
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
    .update({ status: mappedStatus })
    .eq('external_message_id', messageIdToUpdate)

  if (error) {
    console.error('Error updating message status:', error)
  } else {
    console.log(`Updated ${count || 0} message(s) status to ${mappedStatus}`)
  }
}
