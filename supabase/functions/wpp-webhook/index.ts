import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1'
import { 
  corsHeaders,
  handleCors,
  successResponse,
  errorResponse,
  getErrorMessage,
} from '../_shared/types.ts'

// Version for debugging stale deployments
const VERSION = "v2.5.0";
const DEPLOYED_AT = "2026-02-05T22:00:00Z";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * WPP Platform webhook formats:
 * 
 * 1. Flat message format (current):
 * {
 *   "account": "0000000000009",
 *   "from": "+79852615056",
 *   "raw_from": "79852615056@c.us",
 *   "text": "Привет"
 * }
 * 
 * 2. Event-wrapped format (legacy):
 * {
 *   "type": "message.incoming",
 *   "data": { ... }
 * }
 */

interface WppWebhookPayload {
  // Flat message fields
  account?: string;
  from?: string;
  raw_from?: string;
  text?: string;
  body?: string;
  messageId?: string;
  fromMe?: boolean;
  media?: {
    url?: string;
    mimetype?: string;
    filename?: string;
  };
  // Event wrapper fields
  type?: string;
  event?: string;
  data?: any;
  // QR/Status fields
  qr?: string;
  qrcode?: string;
  status?: string;
  session?: string;
}

Deno.serve(async (req) => {
  console.log(`[wpp-webhook][${VERSION}] Request received at ${new Date().toISOString()}`);
  
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const rawBody = await req.text()
    const url = new URL(req.url)
    
    console.log(`[wpp-webhook][${VERSION}] Raw body:`, rawBody.substring(0, 1000));
    
    // Get account from query params (fallback)
    const accountFromQuery = url.searchParams.get('account')

    const payload: WppWebhookPayload = JSON.parse(rawBody)
    
    // Determine event type - check for flat message format first
    let eventType = payload.type || payload.event || 'unknown'
    
    // If we have 'from' and 'text' at root level, this is a flat incoming message
    const isFlatMessage = !!(payload.from && (payload.text !== undefined || payload.body !== undefined || payload.media))
    
    if (isFlatMessage && eventType === 'unknown') {
      eventType = 'message.incoming'
      console.log(`[wpp-webhook][${VERSION}] Detected flat message format, treating as message.incoming`)
    }
    
    // Extract account - check root level first, then nested
    const account = payload.account || payload.data?.account || accountFromQuery
    
    console.log(`[wpp-webhook][${VERSION}] Event type:`, eventType, 'Account:', account)

    // Log webhook event (fire-and-forget)
    supabase
      .from('webhook_logs')
      .insert({
        messenger_type: 'whatsapp',
        event_type: eventType,
        webhook_data: payload,
        processed: false
      })
      .then(({ error }) => {
        if (error) console.warn('[wpp-webhook] Failed to log event:', error)
      })

    if (!account) {
      console.warn('[wpp-webhook] No account number found')
      return successResponse({ ok: true, message: 'No account to process', _version: VERSION })
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
      return successResponse({ ok: true, message: 'Organization not found', _version: VERSION })
    }

    console.log('[wpp-webhook] Organization ID:', organizationId)

    const sessionName = `wpp_${account}`

    // Handle different event types
    switch (eventType) {
      case 'qr':
        // QR code event
        const qrCode = payload.data?.qr || payload.qrcode || payload.qr
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
        // Incoming message - handle both flat and nested formats
        if (isFlatMessage) {
          await handleIncomingMessage(payload, organizationId)
        } else {
          await handleIncomingMessage(payload.data || payload, organizationId)
        }
        break

      case 'message.sent':
        // Message sent confirmation
        console.log('[wpp-webhook] Message sent:', payload.data?.taskId)
        break

      case 'message.status':
      case 'message_status':
      case 'messages.update':
        // Message status update
        await handleMessageStatus(payload.data || payload)
        break

      case 'sla.violation':
        console.warn('[wpp-webhook] SLA violation:', payload.data)
        break

      case 'message.dead':
        console.error('[wpp-webhook] Message dead (DLQ):', payload.data)
        break

      default:
        console.log('[wpp-webhook] Unhandled event type:', eventType)
    }

    return new Response(
      JSON.stringify({ ok: true, _version: VERSION }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error(`[wpp-webhook][${VERSION}] Error:`, error)
    return new Response(
      JSON.stringify({ ok: false, error: getErrorMessage(error), _version: VERSION }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleIncomingMessage(data: WppWebhookPayload, organizationId: string) {
  // Support both flat format (from, raw_from) and nested format
  const fromField = data.from || (data as any).raw_from
  const rawFrom = data.raw_from || data.from
  const messageText = data.text || data.body || (data.media ? '[Media]' : '')
  const isFromMe = data.fromMe === true
  
  console.log('[wpp-webhook] handleIncomingMessage called with:', { 
    from: fromField, 
    raw_from: rawFrom, 
    text: messageText?.substring(0, 50),
    isFromMe 
  })
  
  if (!fromField) {
    console.log('[wpp-webhook] No "from" field in message')
    return
  }

  // Extract phone number - handle both formats:
  // "+79852615056" or "79852615056@c.us"
  const cleanFrom = fromField.replace('@c.us', '').replace('@s.whatsapp.net', '').replace('+', '')
  const phone = cleanFrom.replace(/[^\d]/g, '')
  
  // For WhatsApp chat ID, use raw_from if available (includes @c.us)
  const whatsappChatId = rawFrom?.includes('@') ? rawFrom : `${phone}@c.us`
  
  console.log('[wpp-webhook] Extracted phone:', phone, 'whatsappChatId:', whatsappChatId)

  // Check if sender is a teacher (by phone or whatsapp_id)
  const { data: teacherData } = await supabase
    .from('teachers')
    .select('id, first_name, last_name')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .or(`phone.eq.${phone},whatsapp_id.eq.${phone}`)
    .maybeSingle()

  if (teacherData) {
    console.log('[wpp-webhook] Message from teacher:', teacherData.first_name)
    
    const { error: teacherMsgError } = await supabase.from('chat_messages').insert({
      teacher_id: teacherData.id,
      client_id: null,
      organization_id: organizationId,
      message_text: messageText,
      message_type: isFromMe ? 'manager' : 'client',
      messenger_type: 'whatsapp',
      is_outgoing: isFromMe,
      is_read: isFromMe,
      file_url: data.media?.url || null,
      file_name: data.media?.filename || null,
      file_type: data.media?.mimetype ? getFileTypeFromMime(data.media.mimetype) : null,
      external_message_id: data.messageId || (data as any).id || null,
    })
    
    if (teacherMsgError) {
      console.error('[wpp-webhook] Error saving teacher message:', teacherMsgError.message)
    } else {
      console.log('[wpp-webhook] ✅ Teacher message saved')
    }
    
    return
  }

  // Find client by multiple fields: phone, whatsapp_id, whatsapp_chat_id
  console.log('[wpp-webhook] Searching for client with org:', organizationId, 'phone:', phone)
  
  let { data: client } = await supabase
    .from('clients')
    .select('id, organization_id, name, phone, whatsapp_id, whatsapp_chat_id')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .or(`phone.eq.${phone},whatsapp_id.eq.${phone},whatsapp_chat_id.eq.${whatsappChatId}`)
    .maybeSingle()

  console.log('[wpp-webhook] Client search result:', client ? `found: ${client.id} (${client.name})` : 'not found')

  if (!client && !isFromMe) {
    console.log('[wpp-webhook] Creating new client for:', phone)
    
    const { data: newClient, error: createError } = await supabase
      .from('clients')
      .insert({
        organization_id: organizationId,
        name: phone,
        phone: phone,
        whatsapp_id: phone,
        whatsapp_chat_id: whatsappChatId,
        is_active: true,
      })
      .select('id, organization_id, name')
      .single()

    if (createError) {
      // Try to find by unique constraint error (client might be soft-deleted)
      if (createError.code === '23505') {
        console.log('[wpp-webhook] Client exists (unique constraint), trying to find and restore...')
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id, organization_id, name')
          .eq('organization_id', organizationId)
          .or(`phone.eq.${phone},whatsapp_id.eq.${phone}`)
          .maybeSingle()
        
        if (existingClient) {
          // Reactivate soft-deleted client
          await supabase
            .from('clients')
            .update({ is_active: true })
            .eq('id', existingClient.id)
          client = existingClient
          console.log('[wpp-webhook] Client restored:', existingClient.id)
        }
      } else {
        console.error('[wpp-webhook] Error creating client:', createError.message, createError.code)
        return
      }
    } else {
      client = newClient
      console.log('[wpp-webhook] New client created:', newClient?.id)
    }
  }

  if (!client) {
    console.log('[wpp-webhook] No client found and cannot create, skipping message')
    return
  }

  // Update client: last message time, whatsapp fields
  const { error: updateError } = await supabase
    .from('clients')
    .update({ 
      last_message_at: new Date().toISOString(),
      whatsapp_id: phone,
      whatsapp_chat_id: whatsappChatId,
    })
    .eq('id', client.id)

  if (updateError) {
    console.warn('[wpp-webhook] Error updating client:', updateError.message)
  }

  // If outgoing message from phone, mark all unread as read
  if (isFromMe) {
    await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('client_id', client.id)
      .eq('is_read', false)
  }
  
  // Save message
  console.log('[wpp-webhook] Inserting message for client:', client.id, 'text:', messageText?.substring(0, 30))
  
  const { data: insertedMessage, error: messageError } = await supabase
    .from('chat_messages')
    .insert({
      client_id: client.id,
      organization_id: organizationId,
      message_text: messageText,
      message_type: isFromMe ? 'manager' : 'client',
      messenger_type: 'whatsapp',
      is_outgoing: isFromMe,
      is_read: isFromMe,
      file_url: data.media?.url || null,
      file_name: data.media?.filename || null,
      file_type: data.media?.mimetype ? getFileTypeFromMime(data.media.mimetype) : null,
      external_message_id: data.messageId || (data as any).id || null,
    })
    .select('id')
    .single()

  if (messageError) {
    console.error('[wpp-webhook] Error saving message:', messageError.message, messageError.code)
    
    // Fallback: try with minimal fields
    console.log('[wpp-webhook] Retrying with minimal fields...')
    const { data: retryMsg, error: retryError } = await supabase
      .from('chat_messages')
      .insert({
        client_id: client.id,
        organization_id: organizationId,
        message_text: messageText,
        message_type: isFromMe ? 'manager' : 'client',
        is_outgoing: isFromMe,
        is_read: isFromMe,
      })
      .select('id')
      .single()
    
    if (retryError) {
      console.error('[wpp-webhook] Retry also failed:', retryError.message)
    } else {
      console.log('[wpp-webhook] ✅ Message saved (minimal):', retryMsg?.id, 'for client:', client.id)
    }
  } else {
    console.log('[wpp-webhook] ✅ Message saved:', insertedMessage?.id, 'for client:', client.id)
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
