import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate WPP token for session
async function generateWppToken(sessionName: string, wppHost: string, wppSecret: string): Promise<string> {
  const tokenRes = await fetch(
    `${wppHost}/api/${encodeURIComponent(sessionName)}/${wppSecret}/generate-token`,
    { method: 'POST' }
  )
  
  if (!tokenRes.ok) {
    const errorText = await tokenRes.text()
    throw new Error(`Failed to generate WPP token: ${tokenRes.status} - ${errorText}`)
  }
  
  const contentType = tokenRes.headers.get('content-type')
  if (!contentType?.includes('application/json')) {
    const text = await tokenRes.text()
    throw new Error(`WPP API returned non-JSON response: ${text.substring(0, 200)}`)
  }
  
  const tokenData = await tokenRes.json()
  
  if (!tokenData?.token) {
    throw new Error('Failed to generate WPP token: no token in response')
  }
  
  return tokenData.token
}

// Get organization's session name from user
async function getOrgSessionName(userId: string, supabaseClient: any): Promise<string> {
  const { data: profile, error } = await supabaseClient
    .from('profiles')
    .select('organization_id')
    .eq('id', userId)
    .single()

  if (error || !profile?.organization_id) {
    throw new Error('Organization not found for user')
  }

  return `org_${profile.organization_id}`
}

interface SendMessageRequest {
  clientId: string
  message: string
  phoneNumber?: string
  fileUrl?: string
  fileName?: string
}

interface WPPResponse {
  id?: string
  status?: string
  error?: string
  message?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const WPP_BASE_URL = Deno.env.get('WPP_BASE_URL') || 'https://msg.academyos.ru'
    const WPP_AGG_TOKEN = Deno.env.get('WPP_AGG_TOKEN')
    
    if (!WPP_AGG_TOKEN) {
      throw new Error('WPP_AGG_TOKEN is not configured')
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payload = await req.json().catch(() => ({} as any))

    // Handle test connection
    if (payload?.action === 'test_connection') {
      console.log('Testing WPP connection...')
      
      try {
        const sessionName = await getOrgSessionName(user.id, supabase)
        const wppToken = await generateWppToken(sessionName, WPP_BASE_URL, WPP_AGG_TOKEN)
        
        const healthUrl = `${WPP_BASE_URL}/health`
        console.log('Testing connection to:', healthUrl)
        
        const response = await fetch(healthUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${wppToken}`,
          },
        })

        const isHealthy = response.ok
        console.log('Health check result:', isHealthy, response.status)

        return new Response(
          JSON.stringify({ 
            success: isHealthy,
            status: response.status,
            message: isHealthy ? 'WPP connection successful' : 'WPP connection failed',
            session: sessionName
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } catch (error: any) {
        console.error('WPP connection test error:', error)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: error.message 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    const { clientId, message, phoneNumber, fileUrl, fileName } = payload as SendMessageRequest
    
    console.log('Sending WPP message:', { clientId, message, phoneNumber, fileUrl, fileName })

    // Get organization session
    const sessionName = await getOrgSessionName(user.id, supabase)
    const wppToken = await generateWppToken(sessionName, WPP_BASE_URL, WPP_AGG_TOKEN)

    // Get client data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      throw new Error(`Client not found: ${clientError?.message}`)
    }

    // Determine phone number
    const phone = phoneNumber || client.phone
    if (!phone) {
      throw new Error('No phone number available for client')
    }
    
    // Format phone for WhatsApp
    const cleanPhone = phone.replace(/[^\d]/g, '')
    const to = `${cleanPhone}@c.us`

    let wppResponse: WPPResponse

    // Send message through WPP
    if (fileUrl) {
      console.log('Sending media message via WPP')
      wppResponse = await sendMediaMessage(
        wppToken,
        sessionName,
        to,
        fileUrl,
        WPP_BASE_URL,
        fileName,
        message
      )
    } else {
      console.log('Sending text message via WPP')
      wppResponse = await sendTextMessage(
        wppToken,
        sessionName,
        to,
        message,
        WPP_BASE_URL
      )
    }

    console.log('WPP response:', wppResponse)

    // Save message to database
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

    // Update client last message time
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

// Send text message via WPP API
async function sendTextMessage(
  wppToken: string,
  sessionName: string,
  to: string,
  text: string,
  wppHost: string
): Promise<WPPResponse> {
  const url = `${wppHost}/api/${encodeURIComponent(sessionName)}/send-message`
  
  console.log('Sending text message to WPP:', url)
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${wppToken}`,
    },
    body: JSON.stringify({
      phone: to,
      message: text,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('WPP API error:', response.status, errorText)
    throw new Error(`WPP API request failed: ${response.status} - ${errorText}`)
  }

  return await response.json()
}

// Send media message via WPP API
async function sendMediaMessage(
  wppToken: string,
  sessionName: string,
  to: string,
  fileUrl: string,
  wppHost: string,
  fileName?: string,
  caption?: string
): Promise<WPPResponse> {
  const url = `${wppHost}/api/${encodeURIComponent(sessionName)}/send-file-base64`
  
  console.log('Sending media message to WPP:', url)
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${wppToken}`,
    },
    body: JSON.stringify({
      phone: to,
      base64: fileUrl,
      filename: fileName || 'file',
      caption: caption || '',
      mimetype: getMimeTypeFromUrl(fileUrl),
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('WPP API error:', response.status, errorText)
    throw new Error(`WPP API request failed: ${response.status} - ${errorText}`)
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
