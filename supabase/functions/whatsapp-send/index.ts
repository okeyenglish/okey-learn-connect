import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Green-API настройки из environment variables
const greenApiUrl = Deno.env.get('GREEN_API_URL')!
const greenApiIdInstance = Deno.env.get('GREEN_API_ID_INSTANCE')!
const greenApiToken = Deno.env.get('GREEN_API_TOKEN_INSTANCE')!

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
}

interface GreenAPIResponse {
  idMessage?: string;
  error?: string;
  message?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const payload = await req.json().catch(() => ({} as any));

    if (payload?.action === 'test_connection') {
      // Check required secrets first
      if (!greenApiUrl || !greenApiIdInstance || !greenApiToken) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Missing Green-API secrets (GREEN_API_URL, GREEN_API_ID_INSTANCE, GREEN_API_TOKEN_INSTANCE)'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      try {
        const state = await getInstanceState();
        const stateValue = state?.stateInstance || state?.state || state?.status;
        const authorized = String(stateValue || '').toLowerCase() === 'authorized';
        const message = authorized ? 'Instance authorized' : `State: ${stateValue ?? 'unknown'}`;
        return new Response(JSON.stringify({ success: authorized, state, message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ success: false, error: e?.message || 'Failed to reach Green-API' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { clientId, message, phoneNumber, fileUrl, fileName } = payload as SendMessageRequest
    
    console.log('Sending message:', { clientId, message, phoneNumber, fileUrl, fileName })

    // Получаем данные клиента
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      throw new Error(`Client not found: ${clientError?.message}`)
    }

    // Определяем chat ID для WhatsApp
    let chatId = client.whatsapp_chat_id
    
    if (!chatId) {
      // Создаем chat ID из номера телефона
      const phone = phoneNumber || client.phone
      if (!phone) {
        throw new Error('No phone number available for client')
      }
      
      // Форматируем номер для WhatsApp (убираем + и другие символы)
      const cleanPhone = phone.replace(/[^\d]/g, '')
      chatId = `${cleanPhone}@c.us`
      
      // Сохраняем chat ID в базе данных
      await supabase
        .from('clients')
        .update({ whatsapp_chat_id: chatId })
        .eq('id', clientId)
    }

    let greenApiResponse: GreenAPIResponse

    // Отправляем сообщение или файл
    if (fileUrl) {
      greenApiResponse = await sendFileMessage(chatId, fileUrl, fileName, message)
    } else {
      greenApiResponse = await sendTextMessage(chatId, message)
    }

    console.log('Green-API response:', greenApiResponse)

    // Сохраняем сообщение в базу данных
    const messageStatus = greenApiResponse.error ? 'failed' : 'queued'
    
    const { data: savedMessage, error: saveError } = await supabase
      .from('chat_messages')
      .insert({
        client_id: clientId,
        message_text: message,
        message_type: 'manager',
        messenger_type: 'whatsapp',
        message_status: messageStatus,
        green_api_message_id: greenApiResponse.idMessage,
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
        last_message_at: new Date().toISOString()
      })
      .eq('id', clientId)

    return new Response(JSON.stringify({
      success: !greenApiResponse.error,
      messageId: greenApiResponse.idMessage,
      savedMessage,
      error: greenApiResponse.error
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error sending message:', error)
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function sendTextMessage(chatId: string, message: string): Promise<GreenAPIResponse> {
  const url = `${greenApiUrl}/waInstance${greenApiIdInstance}/sendMessage/${greenApiToken}`
  
  console.log('Sending text message to:', chatId)
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chatId,
      message
    })
  })

  const result = await response.json()
  
  if (!response.ok) {
    console.error('Green-API error:', result)
    return { error: result.message || 'Failed to send message' }
  }
  
  return result
}

async function sendFileMessage(chatId: string, fileUrl: string, fileName?: string, caption?: string): Promise<GreenAPIResponse> {
  const url = `${greenApiUrl}/waInstance${greenApiIdInstance}/sendFileByUrl/${greenApiToken}`
  
  console.log('Sending file message to:', chatId, 'File:', fileUrl)
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chatId,
      urlFile: fileUrl,
      fileName: fileName || 'file',
      caption: caption
    })
  })

  const result = await response.json()
  
  if (!response.ok) {
    console.error('Green-API error:', result)
    return { error: result.message || 'Failed to send file' }
  }
  
  return result
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

// Дополнительные функции для работы с Green-API

export async function getInstanceState(): Promise<any> {
  const url = `${greenApiUrl}/waInstance${greenApiIdInstance}/getStateInstance/${greenApiToken}`
  
  const response = await fetch(url)
  return await response.json()
}

export async function getSettings(): Promise<any> {
  const url = `${greenApiUrl}/waInstance${greenApiIdInstance}/getSettings/${greenApiToken}`
  
  const response = await fetch(url)
  return await response.json()
}

export async function setSettings(settings: any): Promise<any> {
  const url = `${greenApiUrl}/waInstance${greenApiIdInstance}/setSettings/${greenApiToken}`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings)
  })
  
  return await response.json()
}