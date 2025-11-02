import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1'
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wpp-signature',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const WPP_SECRET = Deno.env.get('WPP_SECRET')

// Validate webhook signature (optional if WPP supports it)
async function isValidSignature(signature: string, rawBody: string): Promise<boolean> {
  if (!WPP_SECRET) {
    console.warn('No webhook secret configured, skipping signature validation')
    return true
  }

  const hmac = createHmac('sha256', WPP_SECRET)
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
    const signature = req.headers.get('x-wpp-signature') || ''
    
    const validSignature = await isValidSignature(signature, rawBody)
    if (!validSignature) {
      return new Response('Invalid signature', { status: 401, headers: corsHeaders })
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

    // Handle connection status updates
    const eventType = String(event.event || event.type || '').toUpperCase()
    const sessionName = event.session

    if (eventType === 'CONNECTED' && sessionName) {
      // Extract organization_id from session name (org_<uuid>)
      const orgMatch = sessionName.match(/^org_([a-f0-9-]+)$/)
      if (orgMatch) {
        const organizationId = orgMatch[1]
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
      }
    } else if (eventType === 'DISCONNECTED' && sessionName) {
      const orgMatch = sessionName.match(/^org_([a-f0-9-]+)$/)
      if (orgMatch) {
        const organizationId = orgMatch[1]
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
  const { from, text, media, timestamp, id, body, fromMe } = data
  
  if (!from) {
    console.log('No "from" field in message data')
    return
  }

  // Extract phone number
  const phone = from.replace('@c.us', '').replace('@s.whatsapp.net', '')
  const isFromMe = Boolean(fromMe)
  
  console.log('Processing message from:', phone, 'isFromMe:', isFromMe)
  
  // Find organization from session (assuming session format: org_<uuid>)
  // We need to get it from the event context
  // For now, try to find client and infer organization
  
  // Find or create client by phone number
  let { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, organization_id, first_name, last_name')
    .eq('phone', phone)
    .maybeSingle()

  if (!client && !isFromMe) {
    console.log('Creating new client for phone:', phone)
    // Create new client - need organization_id
    // Try to get from existing clients or use first organization
    const { data: anyClient } = await supabase
      .from('clients')
      .select('organization_id')
      .limit(1)
      .single()
    
    if (!anyClient?.organization_id) {
      console.error('Cannot determine organization_id')
      return
    }

    const { data: newClient, error: createError } = await supabase
      .from('clients')
      .insert({
        organization_id: anyClient.organization_id,
        first_name: phone,
        phone: phone,
        lead_status: 'new'
      })
      .select('id, organization_id, first_name, last_name')
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

  // Find or create chat thread
  let { data: thread } = await supabase
    .from('chat_threads')
    .select('id')
    .eq('type', 'client')
    .contains('participants', [client.id])
    .single()

  if (!thread) {
    console.log('Creating new thread for client:', client.id)
    const { data: newThread, error: threadError } = await supabase
      .from('chat_threads')
      .insert({
        type: 'client',
        title: `${client.first_name || ''} ${client.last_name || ''}`.trim() || phone,
        participants: [client.id]
      })
      .select('id')
      .single()

    if (threadError) {
      console.error('Error creating thread:', threadError)
      return
    }
    
    thread = newThread
  }

  // Update thread timestamp
  await supabase
    .from('chat_threads')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', thread.id)

  // Save message to messages table
  const messageText = text || body || (media ? '[Media]' : '')
  
  const { error: messageError } = await supabase
    .from('messages')
    .insert({
      thread_id: thread.id,
      thread_type: 'client',
      author_id: isFromMe ? null : client.id,
      role: isFromMe ? 'agent' : 'user',
      text: messageText,
      status: 'sent',
      attachments: media ? [{
        type: media.mime ? getFileTypeFromMime(media.mime) : 'file',
        url: media.url || null,
        name: media.fileName || null
      }] : null
    })

  if (messageError) {
    console.error('Error saving message:', messageError)
  } else {
    console.log('Message saved successfully to thread:', thread.id)
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
