import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// WPP настройки из environment variables
const wppBaseUrl = Deno.env.get('WPP_BASE_URL') || 'https://msg.academyos.ru'
const wppApiKey = Deno.env.get('WPP_API_KEY')!

// Создаем клиент Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface SendMessageRequest {
  clientId: string;
  message: string;
  phoneNumber?: string;
  fileUrl?: string;
  fileName?: string;
  session?: string;
}

interface WPPResponse {
  id?: string;
  status?: string;
  error?: string;
  message?: string;
}

function authHeaders() {
  return { 
    'Authorization': `Bearer ${wppApiKey}`, 
    'Content-Type': 'application/json' 
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const payload = await req.json().catch(() => ({} as any));

    // Test connection
    if (payload?.action === 'test_connection') {
      if (!wppBaseUrl || !wppApiKey) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Missing WPP secrets (WPP_BASE_URL, WPP_API_KEY)'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        const healthCheck = await fetch(`${wppBaseUrl}/health`, { 
          headers: authHeaders() 
        });
        const isHealthy = healthCheck.ok;
        
        return new Response(JSON.stringify({ 
          success: isHealthy, 
          message: isHealthy ? 'WPP connection successful' : 'WPP health check failed',
          status: healthCheck.status
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: e?.message || 'Failed to reach WPP' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { clientId, message, phoneNumber, fileUrl, fileName, session = 'default' } = payload as SendMessageRequest
    
    console.log('Sending WPP message:', { clientId, message, phoneNumber, fileUrl, fileName })

    // Получаем данные клиента
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      throw new Error(`Client not found: ${clientError?.message}`)
    }

    // Определяем номер телефона
    const phone = phoneNumber || client.phone
    if (!phone) {
      throw new Error('No phone number available for client')
    }
    
    // Форматируем номер для WhatsApp (убираем + и другие символы)
    const cleanPhone = phone.replace(/[^\d]/g, '')
    const to = `${cleanPhone}@c.us`

    let wppResponse: WPPResponse

    // Отправляем сообщение или файл
    if (fileUrl) {
      wppResponse = await sendMediaMessage(to, fileUrl, message, fileName, session)
    } else {
      wppResponse = await sendTextMessage(to, message, session)
    }

    console.log('WPP response:', wppResponse)

    // Сохраняем сообщение в базу данных
    const messageStatus = wppResponse.error ? 'failed' : 'queued'
    
    const { data: savedMessage, error: saveError } = await supabase
      .from('chat_messages')
      .insert({
        client_id: clientId,
        message_text: message,
        message_type: 'manager',
        messenger_type: 'whatsapp',
        message_status: messageStatus,
        green_api_message_id: wppResponse.id,
        is_outgoing: true,
        is_read: true,
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileUrl ? getFileTypeFromUrl(fileUrl) : null
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving message to database:', saveError)
      throw saveError
    }

    // Обновляем время последнего сообщения у клиента
    await supabase
      .from('clients')
      .update({ 
        last_message_at: new Date().toISOString(),
        whatsapp_chat_id: to
      })
      .eq('id', clientId)

    return new Response(JSON.stringify({
      success: !wppResponse.error,
      messageId: wppResponse.id,
      savedMessage,
      error: wppResponse.error
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error sending WPP message:', error)
    
    return new Response(JSON.stringify({ 
      success: false,
      error: (error as any)?.message ?? 'Server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function sendTextMessage(to: string, text: string, session: string): Promise<WPPResponse> {
  const url = `${wppBaseUrl}/messages/text`
  
  console.log('Sending text message to:', to)
  
  const response = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ to, text, session })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('WPP error:', errorText)
    return { error: `WPP_SEND_TEXT_${response.status}` }
  }
  
  return await response.json()
}

async function sendMediaMessage(
  to: string, 
  url: string, 
  caption?: string,
  fileName?: string,
  session?: string
): Promise<WPPResponse> {
  const endpoint = `${wppBaseUrl}/messages/media`
  
  console.log('Sending media message to:', to, 'File:', url)
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ 
      to, 
      url, 
      caption, 
      mime: getMimeTypeFromUrl(url),
      session 
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('WPP error:', errorText)
    return { error: `WPP_SEND_MEDIA_${response.status}` }
  }
  
  return await response.json()
}

function getFileTypeFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const extension = pathname.split('.').pop()?.toLowerCase()
    
    if (!extension) return null
    
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    const videoTypes = ['mp4', 'avi', 'mov', 'wmv', 'flv']
    const audioTypes = ['mp3', 'wav', 'ogg', 'm4a']
    const documentTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']
    
    if (imageTypes.includes(extension)) return 'image'
    if (videoTypes.includes(extension)) return 'video'
    if (audioTypes.includes(extension)) return 'audio'
    if (documentTypes.includes(extension)) return 'document'
    
    return 'file'
  } catch {
    return null
  }
}

function getMimeTypeFromUrl(url: string): string | undefined {
  const extension = url.split('.').pop()?.toLowerCase()
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'mp4': 'video/mp4',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
  }
  return extension ? mimeTypes[extension] : undefined
}
