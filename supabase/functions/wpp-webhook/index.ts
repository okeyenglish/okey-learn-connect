import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1'
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts"
import { 
  corsHeaders,
  handleCors,
  successResponse,
  errorResponse,
  getErrorMessage,
  type WPPWebhookEvent,
  type WPPMessageData,
} from '../_shared/types.ts'
import { extractOrgIdFromSession } from './helpers.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const EXPECTED_SECRET = Deno.env.get('WPP_AGG_TOKEN') || Deno.env.get('WPP_SECRET') || ''

// Validate webhook signature (optional if WPP supports it)
async function isValidSignature(signature: string, rawBody: string): Promise<boolean> {
  if (!EXPECTED_SECRET) {
    console.warn('No webhook secret configured, skipping signature validation')
    return true
  }

  const hmac = createHmac('sha256', EXPECTED_SECRET)
  hmac.update(rawBody)
  const expectedSignature = hmac.digest('hex')
  
  return signature === expectedSignature
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const rawBody = await req.text()
    const url = new URL(req.url)

    // Validate via query/header secret first (preferred by our start-session config)
    const secretParam = url.searchParams.get('secret') || req.headers.get('x-webhook-secret') || ''
    if (secretParam && EXPECTED_SECRET && secretParam === EXPECTED_SECRET) {
      console.log('Webhook secret validated via query/header')
    } else {
      // Fallback to signature validation if provided
      const signature = req.headers.get('x-wpp-signature') || ''
      const validSignature = await isValidSignature(signature, rawBody)
      if (!validSignature) {
        return errorResponse('Invalid signature', 401)
      }
    }

    const event: WPPWebhookEvent = JSON.parse(rawBody)
    
    console.log('WPP Webhook received:', event.type || event.event)

    // Log webhook event
    await supabase
      .from('webhook_logs')
      .insert({
        messenger_type: 'whatsapp',
        event_type: event.type || event.event || 'unknown',
        webhook_data: event,
        processed: false
      })

    // Handle connection and QR updates
    const eventType = String(event.event || event.type || '').toUpperCase()
    const sessionName = event.session
    const qrCode = event.qrcode || event.qr || event?.data?.qrcode || null

    // Extract organization_id from session name (org_<uuid>)
    const orgMatch = sessionName ? String(sessionName).match(/^org_([a-f0-9-]+)$/) : null
    const organizationId = orgMatch ? orgMatch[1] : null

    if (organizationId) {
      if (qrCode) {
        await supabase
          .from('whatsapp_sessions')
          .upsert({
            organization_id: organizationId,
            session_name: sessionName,
            status: 'qr_issued',
            last_qr_b64: qrCode,
            last_qr_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'organization_id' })
        console.log(`QR received for ${sessionName} (org ${organizationId})`)
      } else if (eventType === 'CONNECTED' || eventType === 'READY') {
        await supabase
          .from('whatsapp_sessions')
          .update({
            status: 'connected',
            last_qr_b64: null,
            last_qr_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('organization_id', organizationId)
        console.log(`Session ${sessionName} connected for org ${organizationId}`)
      } else if (eventType === 'DISCONNECTED' || eventType === 'LOGOUT') {
        await supabase
          .from('whatsapp_sessions')
          .update({
            status: 'disconnected',
            updated_at: new Date().toISOString(),
          })
          .eq('organization_id', organizationId)
        console.log(`Session ${sessionName} disconnected for org ${organizationId}`)
      }
    }

    // Handle different event types for messages
    const msgEvent = event.type || event.event
    switch (msgEvent) {
      case 'message':
      case 'message_in':
      case 'messages.upsert':
        await handleIncomingMessage(event.data || event)
        break
      case 'message.status':
      case 'message_status':
      case 'messages.update':
        await handleMessageStatus(event.data || event)
        break
      default:
        console.log('Event handled:', msgEvent)
    }

    return successResponse({ ok: true })

  } catch (error: unknown) {
    console.error('WPP Webhook error:', error)
    return errorResponse(getErrorMessage(error), 500)
  }
})

async function handleIncomingMessage(data: WPPMessageData) {
  const { from, text, media, timestamp, id, body, fromMe, session } = data
  
  if (!from) {
    console.log('No "from" field in message data')
    return
  }

  // Extract phone number from WhatsApp format
  const phone = from.replace('@c.us', '').replace('@s.whatsapp.net', '')
  const isFromMe = Boolean(fromMe)
  
  console.log('Processing message from:', phone, 'isFromMe:', isFromMe)
  
  // Determine organization_id from event context
  let organizationId = extractOrgIdFromSession(session || (data as any).sessionName)
  
  // Try to find by Green-API instance ID
  if (!organizationId && (data as any).instanceData?.idInstance) {
    console.log('Looking up organization by idInstance:', (data as any).instanceData.idInstance)
    const { data: settings } = await supabase
      .from('messenger_settings')
      .select('organization_id')
      .eq('green_api_instance_id', (data as any).instanceData.idInstance)
      .maybeSingle()
    organizationId = settings?.organization_id
  }
  
  // Fallback: find any connected WhatsApp session
  if (!organizationId) {
    console.log('Fallback: looking for connected session')
    const { data: sessionData } = await supabase
      .from('whatsapp_sessions')
      .select('organization_id')
      .eq('status', 'connected')
      .limit(1)
      .maybeSingle()
    organizationId = sessionData?.organization_id
  }
  
  if (!organizationId) {
    console.error('Cannot determine organization_id for message from:', phone)
    return
  }
  
  console.log('Using organization_id:', organizationId)
  
  // Find or create client by phone number WITH organization_id
  let { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, organization_id, name')
    .eq('phone', phone)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (!client && !isFromMe) {
    console.log('Creating new client for phone:', phone, 'in organization:', organizationId)
    
    const { data: newClient, error: createError } = await supabase
      .from('clients')
      .insert({
        organization_id: organizationId,
        name: phone,
        phone: phone,
      })
      .select('id, organization_id, name')
      .single()

    if (createError) {
      console.error('Error creating client:', createError)
      return
    }
    
    client = newClient
  }

  if (!client) {
    console.log('No client found and message is from me, skipping')
    return
  }

  // Save message to chat_messages table (CRM messages)
  const messageText = text || body || (media ? '[Media]' : '')
  
  // Update client's last_message_at and whatsapp_chat_id
  await supabase
    .from('clients')
    .update({ 
      last_message_at: new Date().toISOString(),
      whatsapp_chat_id: `${phone}@c.us`
    })
    .eq('id', client.id)

  // Also update whatsapp_chat_id in client_phone_numbers if phone matches
  await updatePhoneNumberMessengerData(client.id, {
    phone: phone,
    whatsappChatId: `${phone}@c.us`
  })

  // IMPORTANT: If this is an outgoing message (manager replied from phone),
  // mark all unread messages from this client as read
  if (isFromMe) {
    const { error: markReadError, count: markedCount } = await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('client_id', client.id)
      .eq('is_read', false)

    if (markReadError) {
      console.error('Error marking messages as read:', markReadError)
    } else if (markedCount && markedCount > 0) {
      console.log(`Marked ${markedCount} messages as read for client:`, client.id)
    }
  }
  
  const { error: messageError } = await supabase
    .from('chat_messages')
    .insert({
      client_id: client.id,
      message_text: messageText,
      message_type: isFromMe ? 'manager' : 'client',
      is_read: isFromMe, // Outgoing messages are already read
      is_outgoing: isFromMe,
      messenger_type: 'whatsapp',
      file_url: media?.url || null,
      file_name: media?.fileName || null,
      file_type: media?.mime || media?.mimetype ? getFileTypeFromMime(media?.mime || media?.mimetype || '') : null,
      webhook_id: id || null,
    })

  if (messageError) {
    console.error('Error saving message:', messageError)
  } else {
    console.log('Message saved successfully for client:', client.id)
  }
}

async function handleMessageStatus(data: WPPMessageData) {
  const { id } = data
  const status = (data as any).status
  
  if (!id) return

  console.log('Updating message status:', id, status)
  
  // For now, we don't have a way to track message IDs from WPP
  // This would require storing the WPP message ID when sending
}

function getFileTypeFromMime(mime: string): string {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.includes('pdf') || mime.includes('document')) return 'document'
  return 'file'
}

// Helper function to update messenger data in client_phone_numbers
async function updatePhoneNumberMessengerData(
  clientId: string,
  data: { phone?: string | null; whatsappChatId?: string | null }
): Promise<void> {
  if (!data.phone || !data.whatsappChatId) return

  try {
    const cleanPhone = data.phone.replace(/\D/g, '')
    if (cleanPhone.length < 10) return

    const { data: records } = await supabase
      .from('client_phone_numbers')
      .select('id')
      .eq('client_id', clientId)
      .or(`phone.ilike.%${cleanPhone}%,phone.ilike.%${cleanPhone.slice(-10)}%`)
      .limit(1)

    if (records?.[0]) {
      await supabase
        .from('client_phone_numbers')
        .update({ whatsapp_chat_id: data.whatsappChatId })
        .eq('id', records[0].id)
      console.log(`Updated whatsapp_chat_id for phone record ${records[0].id}`)
    }
  } catch (error) {
    console.error('Error updating phone number messenger data:', error)
  }
}
