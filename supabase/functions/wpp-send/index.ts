import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1'
import { 
  corsHeaders, 
  successResponse, 
  errorResponse,
  getErrorMessage,
  handleCors,
  type WppSendRequest,
  type WppSendResponse,
  type WppApiResponse,
} from '../_shared/types.ts'

// Generate WPP token for session
async function generateWppToken(sessionName: string, wppHost: string, wppSecret: string): Promise<string> {
  const tokenUrl = `${wppHost}/api/${encodeURIComponent(sessionName)}/${wppSecret}/generate-token`
  console.log('Requesting WPP token:', tokenUrl)
  
  // First attempt: POST
  let res = await fetch(tokenUrl, { method: 'POST', headers: { 'Authorization': `Bearer ${wppSecret}` } })
  console.log('WPP token response status (POST):', res.status)
  console.log('WPP token response headers (POST):', Object.fromEntries(res.headers.entries()))

  // Helper to extract token from a response
  const parseToken = async (response: Response, label: string): Promise<string | null> => {
    const ct = response.headers.get('content-type') || ''
    const bodyText = await response.text()
    console.log(`WPP token response content-type (${label}):`, ct)
    console.log(`WPP token response body (${label}):`, bodyText)

    if (!response.ok) {
      console.error(`WPP token generation failed (${label}):`, bodyText)
      return null
    }

    if (ct.includes('application/json')) {
      try {
        const json = JSON.parse(bodyText)
        if (json?.token && typeof json.token === 'string') return json.token
      } catch (e) {
        console.error('Failed to parse JSON token:', e)
      }
    }

    // Fallback: plain text token
    if (bodyText && bodyText.trim().length > 0) {
      return bodyText.trim()
    }

    // Fallback: headers
    const headerAuth = response.headers.get('authorization') || response.headers.get('Authorization')
    const headerToken = response.headers.get('x-token') || response.headers.get('X-Token')
    if (headerAuth) return headerAuth.replace(/^Bearer\s+/i, '').trim()
    if (headerToken) return headerToken.trim()

    return null
  }

  let token = await parseToken(res, 'POST')

  // Second attempt: GET if POST failed to yield token
  if (!token) {
    console.log('Retrying WPP token request with GET')
    res = await fetch(tokenUrl, { method: 'GET', headers: { 'Authorization': `Bearer ${wppSecret}` } })
    console.log('WPP token response status (GET):', res.status)
    token = await parseToken(res, 'GET')
  }

  if (!token) {
    throw new Error('Failed to generate WPP token: empty or unrecognized response')
  }

  console.log('Successfully obtained WPP token')
  return token
}

// Get organization's session name from user
async function getOrgSessionName(userId: string, supabaseClient: ReturnType<typeof createClient>): Promise<string> {
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

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

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
      return errorResponse('Missing authorization header', 401)
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return errorResponse('Unauthorized', 401)
    }

    const payload = await req.json().catch(() => ({} as WppSendRequest))

    // Handle test connection
    if (payload?.action === 'test_connection') {
      console.log('Testing WPP connection...')
      
      try {
        const sessionName = await getOrgSessionName(user.id, supabase)
        let wppToken: string
        try {
          wppToken = await generateWppToken(sessionName, WPP_BASE_URL, WPP_AGG_TOKEN)
        } catch {
          console.warn('Falling back to aggregator token for health check')
          wppToken = WPP_AGG_TOKEN
        }
        
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

        const testResponse: WppSendResponse = { 
          success: isHealthy,
          status: response.status,
          message: isHealthy ? 'WPP connection successful' : 'WPP connection failed',
          session: sessionName
        }

        return successResponse(testResponse)
      } catch (error: unknown) {
        console.error('WPP connection test error:', error)
        return errorResponse(getErrorMessage(error), 500)
      }
    }

    const { clientId, message, phoneNumber, fileUrl, fileName } = payload
    
    console.log('Sending WPP message:', { clientId, message, phoneNumber, fileUrl, fileName })

    // Get organization session
    const sessionName = await getOrgSessionName(user.id, supabase)
    let wppToken: string
    try {
      wppToken = await generateWppToken(sessionName, WPP_BASE_URL, WPP_AGG_TOKEN)
    } catch {
      console.warn('Falling back to aggregator token for send')
      wppToken = WPP_AGG_TOKEN
    }

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

    let wppResponse: WppApiResponse

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
        external_message_id: wppResponse.id,
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

    const response: WppSendResponse = {
      success: !wppResponse.error,
      messageId: wppResponse.id,
      savedMessageId: savedMessage?.id,
    }
    
    if (wppResponse.error) {
      response.error = wppResponse.error
    }
    
    return successResponse(response)

  } catch (error: unknown) {
    console.error('Error sending WPP message:', error)
    return errorResponse(getErrorMessage(error), 500)
  }
})

// Send text message via WPP API
async function sendTextMessage(
  wppToken: string,
  sessionName: string,
  to: string,
  text: string,
  wppHost: string
): Promise<WppApiResponse> {
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
): Promise<WppApiResponse> {
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
