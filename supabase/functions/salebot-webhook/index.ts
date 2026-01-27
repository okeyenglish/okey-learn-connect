import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1'
import {
  corsHeaders,
  handleCors,
  successResponse,
  errorResponse,
  getErrorMessage,
  sendPushNotification,
  getOrgAdminManagerUserIds,
  type SalebotWebhookPayload,
  type SalebotClientData,
  type MessengerTypeValue,
} from '../_shared/types.ts'

console.log('salebot-webhook function booted')

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Map Salebot client_type to our messenger_type
// Salebot client_type values (official documentation):
// 0 = VK (Вконтакте)
// 1 = Telegram
// 2 = Viber
// 3 = Facebook
// 5 = Online chat
// 6 = WhatsApp
// 7 = Avito
// 8 = Odnoklassniki
// 10 = Instagram
// 12 = Yula
// 13 = Telephony
// 14 = Email
// 16 = Telegram Business Account
// 19 = Cian
// 20 = Max
// 21 = Telegram account
// 22 = TikTok
function getMessengerType(clientType: number): MessengerTypeValue {
  switch (clientType) {
    case 0: 
      return 'vk'
    case 1: 
    case 16: 
    case 21: 
      return 'telegram'
    case 2: 
      return 'viber'
    case 6: 
      return 'whatsapp'
    case 20:
      return 'max'
    default: 
      console.log('Unmapped client_type:', clientType, '- defaulting to telegram')
      return 'telegram'
  }
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Support GET/HEAD for health checks
  if (req.method === 'GET' || req.method === 'HEAD') {
    return successResponse({ ok: true, service: 'salebot-webhook' })
  }

  try {
    const rawBody = await req.text()
    let payload: SalebotWebhookPayload

    try {
      payload = JSON.parse(rawBody)
    } catch (e) {
      console.error('Failed to parse JSON:', rawBody.slice(0, 500))
      return errorResponse('Invalid JSON', 400)
    }

    console.log('Salebot webhook received:', {
      messageId: payload.id,
      salebotClientId: payload.client?.id,
      clientType: payload.client?.client_type,
      recepient: payload.client?.recepient,
      isInput: payload.is_input,
      message: payload.message?.slice(0, 100)
    })

    // Log to webhook_logs
    await supabase.from('webhook_logs').insert({
      messenger_type: 'salebot',
      event_type: payload.is_input === 1 ? 'incoming_message' : 'outgoing_message',
      webhook_data: payload,
      processed: false
    })

    // Validate payload
    if (!payload.client?.id) {
      console.error('No client.id in payload')
      return errorResponse('Missing client.id', 400)
    }

    // Determine messenger type early for proper client lookup
    const messengerType = getMessengerType(payload.client.client_type)
    const telegramUserId = messengerType === 'telegram' && payload.client.recepient 
      ? parseInt(payload.client.recepient) || null 
      : null

    // Find existing client by salebot_client_id FIRST
    let { data: existingClient, error: findError } = await supabase
      .from('clients')
      .select('id, organization_id, name, telegram_user_id, salebot_client_id')
      .eq('salebot_client_id', payload.client.id)
      .maybeSingle()

    if (findError) {
      console.error('Error finding client by salebot_client_id:', findError)
    }

    // If not found by salebot_client_id, try to find by telegram_user_id (to prevent duplicates)
    if (!existingClient && telegramUserId) {
      console.log('Client not found by salebot_client_id, searching by telegram_user_id:', telegramUserId)
      const { data: clientByTelegram, error: telegramFindError } = await supabase
        .from('clients')
        .select('id, organization_id, name, telegram_user_id, salebot_client_id')
        .eq('telegram_user_id', telegramUserId)
        .maybeSingle()

      if (telegramFindError) {
        console.error('Error finding client by telegram_user_id:', telegramFindError)
      } else if (clientByTelegram) {
        existingClient = clientByTelegram
        console.log('Found existing client by telegram_user_id:', existingClient.id)
      }
    }

    let clientId: string
    let organizationId: string

    if (existingClient) {
      clientId = existingClient.id
      organizationId = existingClient.organization_id
      console.log('Found existing client:', clientId, 'org:', organizationId)
      
      // Update salebot_client_id if not set yet (client was created from wappi/telegram)
      if (!existingClient.salebot_client_id) {
        console.log('Updating salebot_client_id for existing client:', payload.client.id)
        await supabase
          .from('clients')
          .update({ salebot_client_id: payload.client.id })
          .eq('id', clientId)
      }
      
      // Update telegram_user_id if this is telegram client and not set yet
      if (telegramUserId && !existingClient.telegram_user_id) {
        console.log('Updating telegram_user_id for existing client:', telegramUserId)
        await supabase
          .from('clients')
          .update({ 
            telegram_user_id: telegramUserId,
            telegram_chat_id: payload.client.recepient
          })
          .eq('id', clientId)
      }
    } else {
      // Client not found - create new one
      // Get default organization (first active one)
      const { data: defaultOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()

      if (!defaultOrg) {
        console.error('No active organization found')
        return errorResponse('No organization', 500)
      }

      organizationId = defaultOrg.id
      
      // Create new client with correct messenger identifiers
      const clientName = payload.client.name || `Salebot ${payload.client.id}`
      const clientData: any = {
        name: clientName,
        salebot_client_id: payload.client.id,
        avatar_url: payload.client.avatar || null,
        organization_id: organizationId,
        is_active: true,
      }
      
      // Set messenger-specific identifiers based on client_type
      if (messengerType === 'telegram') {
        clientData.telegram_user_id = parseInt(payload.client.recepient) || null
        clientData.telegram_chat_id = payload.client.recepient
      } else if (messengerType === 'whatsapp') {
        // For WhatsApp, recepient is phone number
        clientData.phone = payload.client.recepient?.replace(/\D/g, '') || null
      }
      
      const { data: newClient, error: createError } = await supabase
        .from('clients')
        .insert(clientData)
        .select('id')
        .single()

      if (createError || !newClient) {
        console.error('Error creating client:', createError)
        return errorResponse('Failed to create client', 500)
      }

      clientId = newClient.id
      console.log('Created new client:', clientId, 'name:', clientName, 'messenger:', messengerType)
    }

    // Check for duplicate message by salebot_message_id
    const salebotMessageId = String(payload.id)
    const { data: existingMessage } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('salebot_message_id', salebotMessageId)
      .maybeSingle()

    if (existingMessage) {
      console.log('Duplicate message, skipping:', salebotMessageId)
      return successResponse({ ok: true, duplicate: true })
    }

    // Determine message properties
    const isFromClient = payload.is_input === 1
    
    // Extract file URL from attachments
    let fileUrl: string | null = null
    let fileName: string | null = null
    let fileType: string | null = null
    
    if (payload.attachments && payload.attachments.length > 0) {
      const firstAttachment = payload.attachments[0]
      if (typeof firstAttachment === 'string') {
        fileUrl = firstAttachment
        fileName = firstAttachment.split('/').pop() || 'file'
        fileType = guessFileType(firstAttachment)
      } else if (typeof firstAttachment === 'object') {
        fileUrl = firstAttachment.url || firstAttachment.file || null
        fileName = firstAttachment.name || firstAttachment.filename || null
        fileType = firstAttachment.type || (fileUrl ? guessFileType(fileUrl) : null)
      }
    }

    // Insert message
    const { error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        client_id: clientId,
        organization_id: organizationId,
        message_text: payload.message || '',
        message_type: isFromClient ? 'client' : 'manager',
        is_outgoing: !isFromClient,
        is_read: !isFromClient, // Outgoing messages are read by default
        messenger_type: messengerType,
        salebot_message_id: salebotMessageId,
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileType,
      })

    if (insertError) {
      console.error('Error inserting message:', insertError)
      return errorResponse('Failed to save message', 500)
    }

    console.log('Message saved for client:', clientId, 'type:', isFromClient ? 'client' : 'manager')

    // Send push notification for incoming messages
    if (isFromClient) {
      console.log('[salebot-webhook] Incoming message - sending push to admins/managers for org:', organizationId)
      
      // Get admin and manager users for THIS organization only
      const userIds = await getOrgAdminManagerUserIds(supabase, organizationId);
      
      if (userIds.length > 0) {
        const clientName = payload.client.name || `Клиент ${payload.client.id}`
        const messagePreview = (payload.message || '').slice(0, 50) + ((payload.message?.length || 0) > 50 ? '...' : '')
        
        const pushResult = await sendPushNotification({
          userIds,
          payload: {
            title: '💬 Новое сообщение',
            body: `${clientName}: ${messagePreview || 'Новое сообщение'}`,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: `chat-${clientId}-${Date.now()}`,
            url: `/newcrm?clientId=${clientId}`,
          },
        })
        
        console.log('[salebot-webhook] Push result:', pushResult)
        
        // Log push result for diagnostics
        await supabase.from('webhook_logs').insert({
          messenger_type: 'push-diagnostic',
          event_type: 'push-sent',
          webhook_data: {
            clientId,
            organizationId,
            userIds,
            pushResult,
            timestamp: new Date().toISOString(),
          },
          processed: true
        }).catch(e => console.error('[salebot-webhook] Failed to log push result:', e))
      } else {
        console.log('[salebot-webhook] No admin/manager users found for push in org:', organizationId)
      }
    }

    // Update client's last_message_at and avatar
    const updateData: any = {
      last_message_at: new Date().toISOString()
    }
    
    if (payload.client.avatar) {
      updateData.avatar_url = payload.client.avatar
    }
    
    if (payload.client.name && payload.client.name !== existingClient?.name) {
      updateData.name = payload.client.name
    }

    await supabase
      .from('clients')
      .update(updateData)
      .eq('id', clientId)

    // Mark webhook log as processed
    await supabase
      .from('webhook_logs')
      .update({ processed: true })
      .eq('webhook_data->id', payload.id)

    return successResponse({ ok: true })

  } catch (error: unknown) {
    console.error('Salebot webhook error:', error)
    return errorResponse(getErrorMessage(error), 500)
  }
})

// Helper to guess file type from URL
function guessFileType(url: string): string {
  const lower = url.toLowerCase()
  if (lower.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'image'
  if (lower.match(/\.(mp4|avi|mov|webm)$/)) return 'video'
  if (lower.match(/\.(mp3|ogg|wav|aac)$/)) return 'audio'
  if (lower.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/)) return 'document'
  return 'file'
}
