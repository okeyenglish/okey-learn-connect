import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const WAPPI_BASE_URL = 'https://wappi.pro'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface SendMessageRequest {
  clientId: string;
  message: string;
  phoneNumber?: string;
  fileUrl?: string;
  fileName?: string;
  phoneId?: string;
}

interface WappiResponse {
  status?: string;
  message_id?: string;
  id?: string;
  error?: string;
  description?: string;
}

async function getWappiCredentials(organizationId?: string): Promise<{ profileId: string; apiToken: string } | null> {
  let query = supabase
    .from('messenger_settings')
    .select('settings')
    .eq('messenger_type', 'whatsapp')
    .eq('provider', 'wappi')
    .eq('is_enabled', true)

  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  }

  const { data, error } = await query.limit(1).maybeSingle()

  if (error || !data) {
    console.error('Error getting Wappi credentials:', error)
    return null
  }

  const settings = data.settings as any
  return {
    profileId: settings?.wappiProfileId || '',
    apiToken: settings?.wappiApiToken || ''
  }
}

async function getWappiStatus(profileId: string, apiToken: string): Promise<any> {
  const url = `${WAPPI_BASE_URL}/api/sync/get/status?profile_id=${profileId}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': apiToken,
      'Content-Type': 'application/json'
    }
  })

  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text, error: 'NON_JSON_RESPONSE' }
  }
}

async function sendTextMessage(profileId: string, apiToken: string, recipient: string, body: string): Promise<WappiResponse> {
  const url = `${WAPPI_BASE_URL}/api/sync/message/send?profile_id=${profileId}`

  console.log('Sending text message via Wappi to:', recipient)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': apiToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      recipient,
      body
    })
  })

  const text = await response.text()
  let result: any

  try {
    result = JSON.parse(text)
  } catch {
    console.error('Wappi returned non-JSON response:', text.substring(0, 200))
    return { error: `Invalid API response: ${text.substring(0, 100)}` }
  }

  if (!response.ok) {
    console.error('Wappi error:', result)
    return { error: result.description || result.message || 'Failed to send message' }
  }

  return result
}

async function sendFileByUrl(profileId: string, apiToken: string, recipient: string, fileUrl: string, caption?: string): Promise<WappiResponse> {
  const url = `${WAPPI_BASE_URL}/api/sync/message/file/url/send?profile_id=${profileId}`

  console.log('Sending file via Wappi to:', recipient, 'File:', fileUrl)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': apiToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      recipient,
      url: fileUrl,
      caption: caption || ''
    })
  })

  const text = await response.text()
  let result: any

  try {
    result = JSON.parse(text)
  } catch {
    console.error('Wappi returned non-JSON response:', text.substring(0, 200))
    return { error: `Invalid API response: ${text.substring(0, 100)}` }
  }

  if (!response.ok) {
    console.error('Wappi error:', result)
    return { error: result.description || result.message || 'Failed to send file' }
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const payload = await req.json().catch(() => ({} as any))

    // Get user's organization for credentials lookup
    let organizationId: string | undefined
    const authHeader = req.headers.get('authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      })
      const { data: { user } } = await supabaseAuth.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single()
        organizationId = profile?.organization_id
      }
    }

    const credentials = await getWappiCredentials(organizationId)

    // Handle get_state action
    if (payload?.action === 'get_state') {
      if (!credentials?.profileId || !credentials?.apiToken) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Missing Wappi credentials (Profile ID, API Token)'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      try {
        const state = await getWappiStatus(credentials.profileId, credentials.apiToken)
        const status = state?.status || state?.state
        const authorized = status === 'online' || status === 'connected' || status === 'authenticated'

        return new Response(JSON.stringify({
          success: authorized,
          state,
          status
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } catch (e: any) {
        return new Response(JSON.stringify({ success: false, error: e?.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Handle test_connection action
    if (payload?.action === 'test_connection') {
      if (!credentials?.profileId || !credentials?.apiToken) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Missing Wappi credentials. Please configure Profile ID and API Token.'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      try {
        const state = await getWappiStatus(credentials.profileId, credentials.apiToken)
        const status = state?.status || state?.state
        const authorized = status === 'online' || status === 'connected' || status === 'authenticated'

        const message = authorized
          ? 'Wappi connected successfully'
          : `Status: ${status || 'unknown'}`

        return new Response(JSON.stringify({
          success: authorized,
          state,
          message,
          phone: state?.phone
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } catch (e: any) {
        return new Response(JSON.stringify({
          success: false,
          error: e?.message || 'Failed to reach Wappi API'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Send message flow
    const { clientId, message, phoneNumber, fileUrl, fileName, phoneId } = payload as SendMessageRequest

    if (!clientId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'clientId is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!credentials?.profileId || !credentials?.apiToken) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Wappi credentials not configured'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Sending message via Wappi:', { clientId, message, phoneNumber, fileUrl, fileName, phoneId })

    // Get client data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      throw new Error(`Client not found: ${clientError?.message}`)
    }

    // Determine phone number for WhatsApp
    let recipient: string | null = null

    // Priority 1: Use specified phone number's data
    if (phoneId) {
      const { data: phoneRecord } = await supabase
        .from('client_phone_numbers')
        .select('whatsapp_chat_id, phone')
        .eq('id', phoneId)
        .eq('client_id', clientId)
        .single()

      if (phoneRecord) {
        recipient = phoneRecord.whatsapp_chat_id || phoneRecord.phone?.replace(/[^\d]/g, '')
        console.log('Using specified phone:', phoneId, 'recipient:', recipient)
      }
    }

    // Priority 2: Use primary phone number
    if (!recipient) {
      const { data: primaryPhone } = await supabase
        .from('client_phone_numbers')
        .select('whatsapp_chat_id, phone')
        .eq('client_id', clientId)
        .eq('is_primary', true)
        .single()

      if (primaryPhone) {
        recipient = primaryPhone.whatsapp_chat_id || primaryPhone.phone?.replace(/[^\d]/g, '')
        console.log('Using primary phone recipient:', recipient)
      }
    }

    // Priority 3: Fall back to client's whatsapp_chat_id
    if (!recipient) {
      const chatId = client.whatsapp_chat_id
      if (chatId) {
        // Extract phone number from chatId (remove @c.us suffix)
        recipient = chatId.replace('@c.us', '')
      }
    }

    // Priority 4: Use provided phone number or client phone
    if (!recipient) {
      let phone = phoneNumber || client.phone

      if (!phone) {
        const { data: phoneNumbers } = await supabase
          .from('client_phone_numbers')
          .select('phone')
          .eq('client_id', clientId)
          .eq('is_whatsapp_enabled', true)
          .limit(1)
          .single()

        if (!phoneNumbers?.phone) {
          const { data: anyPhone } = await supabase
            .from('client_phone_numbers')
            .select('phone')
            .eq('client_id', clientId)
            .limit(1)
            .single()

          phone = anyPhone?.phone
        } else {
          phone = phoneNumbers.phone
        }
      }

      if (!phone) {
        throw new Error('No phone number available for client')
      }

      recipient = phone.replace(/[^\d]/g, '')
    }

    if (!recipient) {
      throw new Error('Could not determine recipient phone number')
    }

    console.log('Final recipient:', recipient)

    let wappiResponse: WappiResponse

    // Send message or file
    if (fileUrl) {
      wappiResponse = await sendFileByUrl(credentials.profileId, credentials.apiToken, recipient, fileUrl, message)
    } else {
      wappiResponse = await sendTextMessage(credentials.profileId, credentials.apiToken, recipient, message)
    }

    console.log('Wappi response:', wappiResponse)

    // Save message to database
    const messageStatus = wappiResponse.error ? 'failed' : 'queued'
    const externalMessageId = wappiResponse.message_id || wappiResponse.id

    const { data: savedMessage, error: saveError } = await supabase
      .from('chat_messages')
      .insert({
        client_id: clientId,
        organization_id: client.organization_id,
        message_text: message,
        message_type: 'manager',
        messenger_type: 'whatsapp',
        message_status: messageStatus,
        external_message_id: externalMessageId,
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

    // Update client's last message timestamp
    await supabase
      .from('clients')
      .update({
        last_message_at: new Date().toISOString(),
        whatsapp_chat_id: `${recipient}@c.us`
      })
      .eq('id', clientId)

    return new Response(JSON.stringify({
      success: !wappiResponse.error,
      messageId: externalMessageId,
      savedMessage,
      error: wappiResponse.error
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error sending message via Wappi:', error)

    return new Response(JSON.stringify({
      success: false,
      error: (error as any)?.message ?? 'Server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
