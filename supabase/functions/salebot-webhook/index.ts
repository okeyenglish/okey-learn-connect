import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Map Salebot client_type to our messenger_type
function getMessengerType(clientType: number): 'whatsapp' | 'telegram' | 'viber' | 'vk' {
  switch (clientType) {
    case 1: return 'whatsapp'
    case 2: return 'telegram'
    case 3: return 'viber'
    case 4: return 'vk'
    default: return 'whatsapp'
  }
}

// Salebot webhook payload interface
interface SalebotWebhookPayload {
  id: number                    // Salebot message ID
  client: {
    id: number                  // salebot_client_id
    recepient: string           // ID in messenger
    client_type: number         // messenger type
    name: string
    avatar: string
    created_at: string
    tag: string
    group: string               // bot name
  }
  message: string               // message text
  attachments: any[]            // files
  message_id: number            // block ID
  project_id: number            // project ID
  is_input: 0 | 1               // 1 = from client, 0 = from bot
  delivered: 0 | 1
  error_message: string | null
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const rawBody = await req.text()
    let payload: SalebotWebhookPayload

    try {
      payload = JSON.parse(rawBody)
    } catch (e) {
      console.error('Failed to parse JSON:', rawBody.slice(0, 500))
      return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
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
      return new Response(JSON.stringify({ ok: false, error: 'Missing client.id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Find existing client by salebot_client_id
    let { data: existingClient, error: findError } = await supabase
      .from('clients')
      .select('id, organization_id, name, telegram_user_id')
      .eq('salebot_client_id', payload.client.id)
      .maybeSingle()

    if (findError) {
      console.error('Error finding client:', findError)
    }

    let clientId: string
    let organizationId: string

    if (existingClient) {
      clientId = existingClient.id
      organizationId = existingClient.organization_id
      console.log('Found existing client:', clientId, 'org:', organizationId)
      
      // Update telegram_user_id if this is telegram client and not set yet
      const messengerType = getMessengerType(payload.client.client_type)
      if (messengerType === 'telegram' && payload.client.recepient) {
        const telegramUserId = parseInt(payload.client.recepient) || null
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
        return new Response(JSON.stringify({ ok: false, error: 'No organization' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      organizationId = defaultOrg.id

      // Determine messenger type from client_type
      const messengerType = getMessengerType(payload.client.client_type)
      
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
        return new Response(JSON.stringify({ ok: false, error: 'Failed to create client' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
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
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Determine message properties
    const isFromClient = payload.is_input === 1
    const messengerType = getMessengerType(payload.client.client_type)
    
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
      return new Response(JSON.stringify({ ok: false, error: 'Failed to save message' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Message saved for client:', clientId, 'type:', isFromClient ? 'client' : 'manager')

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

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Salebot webhook error:', error)
    
    return new Response(JSON.stringify({ 
      ok: false, 
      error: (error as any)?.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
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
