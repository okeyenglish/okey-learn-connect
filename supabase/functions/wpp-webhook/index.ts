import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1'
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts"
import { extractOrgIdFromSession } from './helpers.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wpp-signature',
}

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

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
        return new Response('Invalid signature', { status: 401, headers: corsHeaders })
      }
    }

    const event = JSON.parse(rawBody)
    
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

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('WPP Webhook error:', error)
    
    return new Response(JSON.stringify({ 
      ok: false, 
      error: (error as any)?.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function handleIncomingMessage(data: any) {
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
  let organizationId = extractOrgIdFromSession(session || data.sessionName)
  
  // Try to find by Green-API instance ID
  if (!organizationId && data.instanceData?.idInstance) {
    console.log('Looking up organization by idInstance:', data.instanceData.idInstance)
    const { data: settings } = await supabase
      .from('messenger_settings')
      .select('organization_id')
      .eq('green_api_instance_id', data.instanceData.idInstance)
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
  
  // Update client's last_message_at
  await supabase
    .from('clients')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', client.id)
  
  const { error: messageError } = await supabase
    .from('chat_messages')
    .insert({
      client_id: client.id,
      message_text: messageText,
      message_type: isFromMe ? 'manager' : 'client',
      is_read: false,
      is_outgoing: isFromMe,
      messenger_type: 'whatsapp',
      file_url: media?.url || null,
      file_name: media?.fileName || null,
      file_type: media?.mime ? getFileTypeFromMime(media.mime) : null,
      webhook_id: id || null,
    })

  if (messageError) {
    console.error('Error saving message:', messageError)
  } else {
    console.log('Message saved successfully for client:', client.id)
  }
}

async function handleMessageStatus(data: any) {
  const { id, status } = data
  
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
