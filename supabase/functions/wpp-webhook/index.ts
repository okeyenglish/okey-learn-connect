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
  const { from, text, media, timestamp, id, body } = data
  
  if (!from) return

  // Extract phone number
  const phone = from.replace('@c.us', '').replace('@s.whatsapp.net', '')
  
  // Find or create client by phone number
  let { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('phone', `+${phone}`)
    .single()

  if (!client) {
    // Create new client
    const { data: newClient, error: createError } = await supabase
      .from('clients')
      .insert({
        name: from,
        phone: `+${phone}`,
        whatsapp_chat_id: from,
        lead_status: 'new',
        last_message_at: new Date(timestamp || Date.now()).toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating client:', createError)
      return
    }
    
    client = newClient
  }

  // Save incoming message
  await supabase
    .from('chat_messages')
    .insert({
      client_id: client.id,
      message_text: text || body || '[Media]',
      message_type: 'client',
      messenger_type: 'whatsapp',
      message_status: 'delivered',
      green_api_message_id: id,
      is_outgoing: false,
      is_read: false,
      file_url: media?.url,
      file_name: media?.fileName,
      file_type: media?.mime ? getFileTypeFromMime(media.mime) : null
    })

  // Update client last message time
  await supabase
    .from('clients')
    .update({ 
      last_message_at: new Date(timestamp || Date.now()).toISOString(),
      whatsapp_chat_id: from
    })
    .eq('id', client.id)
}

async function handleMessageStatus(data: any) {
  const { id, status } = data
  
  if (!id) return

  // Update message status
  await supabase
    .from('chat_messages')
    .update({ message_status: status })
    .eq('green_api_message_id', id)
}

function getFileTypeFromMime(mime: string): string {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.includes('pdf') || mime.includes('document')) return 'document'
  return 'file'
}
