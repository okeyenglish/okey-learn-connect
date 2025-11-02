import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wpp-signature',
}

const WEBHOOK_SECRET = Deno.env.get('WPP_WEBHOOK_SECRET')

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

function isValidSignature(signature: string, rawBody: string): boolean {
  if (!WEBHOOK_SECRET) return true; // если не используем подпись
  
  const hmac = createHmac('sha256', WEBHOOK_SECRET);
  hmac.update(rawBody);
  const calculatedSignature = hmac.digest('hex');
  
  try {
    return signature === calculatedSignature;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-wpp-signature') || ''
    
    if (!isValidSignature(signature, rawBody)) {
      return new Response('Invalid signature', { status: 401, headers: corsHeaders })
    }

    const event = JSON.parse(rawBody)
    
    console.log('WPP Webhook received:', event.type)

    // Логируем webhook
    await supabase
      .from('webhook_logs')
      .insert({
        messenger_type: 'whatsapp',
        event_type: event.type,
        webhook_data: event,
        processed: false
      })

    switch (event.type) {
      case 'message_in':
        await handleIncomingMessage(event.data)
        break
      
      case 'message_status':
        await handleMessageStatus(event.data)
        break
      
      case 'session_update':
        await handleSessionUpdate(event.data)
        break
      
      default:
        console.log('Unknown event type:', event.type)
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
  const { from, text, media, timestamp, id } = data
  
  if (!from) return

  // Извлекаем номер телефона
  const phone = from.replace('@c.us', '').replace('@s.whatsapp.net', '')
  
  // Находим или создаем клиента по номеру телефона
  let { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('phone', `+${phone}`)
    .single()

  if (!client) {
    // Создаем нового клиента
    const { data: newClient, error: createError } = await supabase
      .from('clients')
      .insert({
        name: from,
        phone: `+${phone}`,
        whatsapp_chat_id: from,
        lead_status: 'new',
        last_message_at: new Date(timestamp).toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating client:', createError)
      return
    }
    
    client = newClient
  }

  // Сохраняем входящее сообщение
  await supabase
    .from('chat_messages')
    .insert({
      client_id: client.id,
      message_text: text || '[Media]',
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

  // Обновляем время последнего сообщения
  await supabase
    .from('clients')
    .update({ 
      last_message_at: new Date(timestamp).toISOString(),
      whatsapp_chat_id: from
    })
    .eq('id', client.id)
}

async function handleMessageStatus(data: any) {
  const { id, status } = data
  
  if (!id) return

  // Обновляем статус сообщения
  await supabase
    .from('chat_messages')
    .update({ message_status: status })
    .eq('green_api_message_id', id)
}

async function handleSessionUpdate(data: any) {
  console.log('Session update:', data)
  // TODO: можно сохранять состояние сессии в таблицу messenger_settings
}

function getFileTypeFromMime(mime: string): string {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.includes('pdf') || mime.includes('document')) return 'document'
  return 'file'
}
