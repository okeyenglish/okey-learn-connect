import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1'
import { 
  corsHeaders,
  handleCors,
  successResponse,
  errorResponse,
  getErrorMessage,
} from '../_shared/types.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * New WPP Platform webhook event format:
 * {
 *   "id": "evt_123",
 *   "type": "message.incoming" | "qr" | "connected" | "offline" | "message.sent" | "sla.violation" | "message.dead",
 *   "created": 1234567890,
 *   "data": { ... }
 * }
 */

interface WppWebhookEvent {
  id?: string;
  type?: string;
  event?: string; // legacy
  created?: number;
  data?: any;
  // Legacy fields
  session?: string;
  qrcode?: string;
  qr?: string;
}

interface WppMessageData {
  account?: string;
  from?: string;
  to?: string;
  text?: string;
  body?: string;
  timestamp?: number;
  messageId?: string;
  media?: {
    url?: string;
    mimetype?: string;
    filename?: string;
  };
  // Legacy fields
  fromMe?: boolean;
  id?: string;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const rawBody = await req.text()
    const url = new URL(req.url)
    
    // Get account from query params (set by our webhook registration)
    const accountFromQuery = url.searchParams.get('account')

    const event: WppWebhookEvent = JSON.parse(rawBody)
    const eventType = event.type || event.event || 'unknown'
    
    console.log('[wpp-webhook] Received event:', eventType)
    console.log('[wpp-webhook] Account from query:', accountFromQuery)

    // Log webhook event
    await supabase
      .from('webhook_logs')
      .insert({
        messenger_type: 'whatsapp',
        event_type: eventType,
        webhook_data: event,
        processed: false
      })
      .catch(e => console.warn('[wpp-webhook] Failed to log event:', e))

    // Extract account number from event or query
    const account = event.data?.account || accountFromQuery

    if (!account) {
      console.warn('[wpp-webhook] No account number in event or query')
      return successResponse({ ok: true, message: 'No account to process' })
    }

    // Find organization by account number
    const { data: integration } = await supabase
      .from('messenger_integrations')
      .select('organization_id, settings')
      .eq('messenger_type', 'whatsapp')
      .eq('provider', 'wpp')
      .eq('is_active', true)
      .filter('settings->>wppAccountNumber', 'eq', account)
      .maybeSingle()

    let organizationId = integration?.organization_id

    // Fallback: find by session name
    if (!organizationId) {
      const sessionName = `wpp_${account}`
      const { data: session } = await supabase
        .from('whatsapp_sessions')
        .select('organization_id')
        .eq('session_name', sessionName)
        .maybeSingle()
      organizationId = session?.organization_id
    }

    if (!organizationId) {
      console.warn('[wpp-webhook] Organization not found for account:', account)
      return successResponse({ ok: true, message: 'Organization not found' })
    }

    console.log('[wpp-webhook] Organization ID:', organizationId)

    const sessionName = `wpp_${account}`

    // Handle different event types
    switch (eventType) {
      case 'qr':
        // QR code event
        const qrCode = event.data?.qr || event.qrcode || event.qr
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
            }, { onConflict: 'session_name' })
          console.log('[wpp-webhook] QR saved for account:', account)
        }
        break

      case 'connected':
      case 'ready':
        // Connection established
        await supabase
          .from('whatsapp_sessions')
          .upsert({
            organization_id: organizationId,
            session_name: sessionName,
            status: 'connected',
            last_qr_b64: null,
            last_qr_at: null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'session_name' })
        console.log('[wpp-webhook] Account connected:', account)
        break

      case 'offline':
      case 'disconnected':
      case 'logout':
        // Disconnection
        await supabase
          .from('whatsapp_sessions')
          .update({
            status: 'disconnected',
            updated_at: new Date().toISOString(),
          })
          .eq('session_name', sessionName)
        console.log('[wpp-webhook] Account disconnected:', account)
        break

      case 'message.incoming':
      case 'message':
      case 'message_in':
      case 'messages.upsert':
        // Incoming message
        await handleIncomingMessage(event.data || event, organizationId)
        break

      case 'message.sent':
        // Message sent confirmation
        console.log('[wpp-webhook] Message sent:', event.data?.taskId)
        break

      case 'message.status':
      case 'message_status':
      case 'messages.update':
        // Message status update
        await handleMessageStatus(event.data || event)
        break

      case 'sla.violation':
        console.warn('[wpp-webhook] SLA violation:', event.data)
        break

      case 'message.dead':
        console.error('[wpp-webhook] Message dead (DLQ):', event.data)
        break

      default:
        console.log('[wpp-webhook] Unhandled event type:', eventType)
    }

    return successResponse({ ok: true })

  } catch (error: unknown) {
    console.error('[wpp-webhook] Error:', error)
    return errorResponse(getErrorMessage(error), 500)
  }
})

async function handleIncomingMessage(data: WppMessageData, organizationId: string) {
  const { from, text, body, media, timestamp, messageId } = data
  const isFromMe = (data as any).fromMe === true
  
  if (!from) {
    console.log('[wpp-webhook] No "from" field in message')
    return
  }

  // Extract phone number
  const phone = from.replace('@c.us', '').replace('@s.whatsapp.net', '').replace(/[^\d]/g, '')
  const messageText = text || body || (media ? '[Media]' : '')
  
  console.log('[wpp-webhook] Processing message from:', phone, 'isFromMe:', isFromMe)

  // Check if sender is a teacher
  const { data: teacherData } = await supabase
    .from('teachers')
    .select('id, first_name, last_name')
    .eq('organization_id', organizationId)
    .eq('whatsapp_id', phone)
    .eq('is_active', true)
    .maybeSingle()

  if (teacherData) {
    console.log('[wpp-webhook] Message from teacher:', teacherData.first_name)
    
    await supabase.from('chat_messages').insert({
      teacher_id: teacherData.id,
      client_id: null,
      organization_id: organizationId,
      message_text: messageText,
      message_type: isFromMe ? 'manager' : 'client',
      messenger_type: 'whatsapp',
      is_outgoing: isFromMe,
      is_read: isFromMe,
      file_url: media?.url || null,
      file_name: media?.filename || null,
      file_type: media?.mimetype ? getFileTypeFromMime(media.mimetype) : null,
      external_message_id: messageId || (data as any).id || null,
    })
    
    return
  }

  // Find or create client
  let { data: client } = await supabase
    .from('clients')
    .select('id, organization_id, name')
    .eq('phone', phone)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (!client && !isFromMe) {
    console.log('[wpp-webhook] Creating new client for:', phone)
    
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
      console.error('[wpp-webhook] Error creating client:', createError)
      return
    }
    
    client = newClient
  }

  if (!client) {
    console.log('[wpp-webhook] No client found, skipping')
    return
  }

  // Update client last message time
  await supabase
    .from('clients')
    .update({ 
      last_message_at: new Date().toISOString(),
      whatsapp_id: phone
    })
    .eq('id', client.id)

  // If outgoing message from phone, mark all unread as read
  if (isFromMe) {
    await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('client_id', client.id)
      .eq('is_read', false)
  }
  
  // Save message
  const { error: messageError } = await supabase
    .from('chat_messages')
    .insert({
      client_id: client.id,
      organization_id: organizationId,
      message_text: messageText,
      message_type: isFromMe ? 'manager' : 'client',
      messenger_type: 'whatsapp',
      is_outgoing: isFromMe,
      is_read: isFromMe,
      file_url: media?.url || null,
      file_name: media?.filename || null,
      file_type: media?.mimetype ? getFileTypeFromMime(media.mimetype) : null,
      external_message_id: messageId || (data as any).id || null,
    })

  if (messageError) {
    console.error('[wpp-webhook] Error saving message:', messageError)
  } else {
    console.log('[wpp-webhook] Message saved for client:', client.id)
  }
}

async function handleMessageStatus(data: any) {
  const { id, status, taskId } = data
  
  if (!id && !taskId) return

  console.log('[wpp-webhook] Message status update:', id || taskId, status)
  
  // Update message status if we have the external_message_id
  if (status && (id || taskId)) {
    await supabase
      .from('chat_messages')
      .update({ message_status: status })
      .eq('external_message_id', id || taskId)
  }
}

function getFileTypeFromMime(mime: string): string {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.includes('pdf') || mime.includes('document')) return 'document'
  return 'file'
}
