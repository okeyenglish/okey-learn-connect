import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1'
import { WppMsgClient } from '../_shared/wpp.ts'
import { 
  corsHeaders, 
  successResponse, 
  errorResponse,
  getErrorMessage,
  handleCors,
} from '../_shared/types.ts'

const WPP_BASE_URL = Deno.env.get('WPP_BASE_URL') || 'https://msg.academyos.ru'

interface WppSendRequest {
  clientId: string;
  message?: string;
  text?: string;
  phoneNumber?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  action?: 'test_connection';
  integration_id?: string;
}

interface WppSendResponse {
  success: boolean;
  messageId?: string;
  taskId?: string;
  savedMessageId?: string;
  status?: number | string;
  message?: string;
  error?: string;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return errorResponse('Missing authorization header', 401)
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return errorResponse('Unauthorized', 401)
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return errorResponse('Organization not found', 404)
    }

    const orgId = profile.organization_id
    const payload = await req.json().catch(() => ({} as WppSendRequest))

    // Find WPP integration
    let integrationQuery = supabase
      .from('messenger_integrations')
      .select('id, settings')
      .eq('organization_id', orgId)
      .eq('messenger_type', 'whatsapp')
      .eq('provider', 'wpp')
      .eq('is_active', true)

    if (payload.integration_id) {
      integrationQuery = integrationQuery.eq('id', payload.integration_id)
    } else {
      integrationQuery = integrationQuery.eq('is_primary', true)
    }

    const { data: integration } = await integrationQuery.maybeSingle()

    if (!integration) {
      // Fallback to any active WPP integration
      const { data: anyIntegration } = await supabase
        .from('messenger_integrations')
        .select('id, settings')
        .eq('organization_id', orgId)
        .eq('messenger_type', 'whatsapp')
        .eq('provider', 'wpp')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      if (!anyIntegration) {
        return errorResponse('WPP integration not configured', 404)
      }
    }

    const settings = (integration?.settings || {}) as Record<string, any>
    const wppApiKey = settings.wppApiKey
    const wppAccountNumber = settings.wppAccountNumber
    const wppJwtToken = settings.wppJwtToken
    const wppJwtExpiresAt = settings.wppJwtExpiresAt

    if (!wppApiKey || !wppAccountNumber) {
      return errorResponse('wppApiKey or wppAccountNumber not configured', 400)
    }

    // Проверяем валидность кешированного JWT (с буфером 60 сек)
    const isTokenValid = wppJwtToken && wppJwtExpiresAt && Date.now() < wppJwtExpiresAt - 60_000
    console.log('[wpp-send] JWT token valid:', isTokenValid, 'expires:', wppJwtExpiresAt ? new Date(wppJwtExpiresAt).toISOString() : 'N/A')

    // Create WPP client with cached token if valid
    const wpp = new WppMsgClient({
      baseUrl: WPP_BASE_URL,
      apiKey: wppApiKey,
      jwtToken: isTokenValid ? wppJwtToken : undefined,
      jwtExpiresAt: isTokenValid ? wppJwtExpiresAt : undefined,
    })

    // Handle test connection
    if (payload?.action === 'test_connection') {
      console.log('Testing WPP connection...')
      
      try {
        const status = await wpp.getAccountStatus(wppAccountNumber)
        const isHealthy = status.status === 'connected'

        const testResponse: WppSendResponse = { 
          success: isHealthy,
          status: status.status,
          message: isHealthy ? 'WPP connection successful' : `Status: ${status.status}`,
        }

        return successResponse(testResponse)
      } catch (error: unknown) {
        console.error('WPP connection test error:', error)
        return errorResponse(getErrorMessage(error), 500)
      }
    }

    // Send message
    const { clientId, message, text, phoneNumber, fileUrl, fileName, fileType } = payload
    const messageText = message || text || ''
    
    console.log('Sending WPP message:', { clientId, messageText: messageText.substring(0, 50), phoneNumber, fileUrl })

    // Get client data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      return errorResponse(`Client not found: ${clientError?.message}`, 404)
    }

    // Determine phone number
    const phone = phoneNumber || client.phone
    if (!phone) {
      return errorResponse('No phone number available for client', 400)
    }
    
    // Format phone for WhatsApp API (just digits)
    const cleanPhone = phone.replace(/[^\d]/g, '')
    const to = cleanPhone // New API expects clean phone number

    console.log('[wpp-send] Sending to:', to)

    let wppResult: { success: boolean; taskId?: string; error?: string }

    // Send message through new WPP API
    if (fileUrl) {
      console.log('Sending media message via WPP')
      
      // Determine media type
      const mediaType = fileType || getFileTypeFromUrl(fileUrl)
      
      if (mediaType === 'image') {
        wppResult = await wpp.sendImage(wppAccountNumber, to, fileUrl, messageText)
      } else if (mediaType === 'video') {
        wppResult = await wpp.sendVideo(wppAccountNumber, to, fileUrl, messageText)
      } else if (mediaType === 'audio') {
        wppResult = await wpp.sendAudio(wppAccountNumber, to, fileUrl)
      } else {
        wppResult = await wpp.sendFile(wppAccountNumber, to, fileUrl, fileName || 'file')
      }
    } else {
      console.log('Sending text message via WPP')
      wppResult = await wpp.sendText(wppAccountNumber, to, messageText)
    }

    console.log('WPP result:', wppResult)

    // Save message to database
    const messageStatus = wppResult.success ? 'sent' : 'failed'
    
    const { data: savedMessage, error: saveError } = await supabase
      .from('chat_messages')
      .insert({
        client_id: clientId,
        organization_id: orgId,
        message_text: messageText,
        is_outgoing: true,
        message_type: 'manager',
        messenger_type: 'whatsapp',
        message_status: messageStatus,
        external_message_id: wppResult.taskId,
        is_read: true,
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileUrl ? getFileTypeFromUrl(fileUrl) : null,
        sender_id: user.id,
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving message to database:', saveError)
    }

    // Update client last message time
    await supabase
      .from('clients')
      .update({ 
        last_message_at: new Date().toISOString(),
        whatsapp_id: to
      })
      .eq('id', clientId)

    const response: WppSendResponse = {
      success: wppResult.success,
      taskId: wppResult.taskId,
      savedMessageId: savedMessage?.id,
    }
    
    if (!wppResult.success) {
      response.error = wppResult.error || 'Failed to send message'
    }

    // Сохраняем обновлённый JWT токен в БД если он изменился
    try {
      const currentToken = await wpp.getToken()
      if (currentToken && currentToken !== wppJwtToken && integration) {
        await supabase
          .from('messenger_integrations')
          .update({
            settings: {
              ...settings,
              wppJwtToken: currentToken,
              wppJwtExpiresAt: wpp.tokenExpiry,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', integration.id)
        console.log('[wpp-send] JWT token refreshed and saved')
      }
    } catch (e) {
      console.warn('[wpp-send] Failed to save refreshed token:', e)
    }
    
    return successResponse(response)

  } catch (error: unknown) {
    console.error('Error sending WPP message:', error)
    return errorResponse(getErrorMessage(error), 500)
  }
})

function getFileTypeFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const extension = pathname.split('.').pop()?.toLowerCase()
    
    if (!extension) return 'file'
    
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    const videoTypes = ['mp4', 'avi', 'mov', 'wmv', 'flv']
    const audioTypes = ['mp3', 'wav', 'ogg', 'm4a', 'opus']
    
    if (imageTypes.includes(extension)) return 'image'
    if (videoTypes.includes(extension)) return 'video'
    if (audioTypes.includes(extension)) return 'audio'
    
    return 'file'
  } catch {
    return 'file'
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
    'ogg': 'audio/ogg',
    'opus': 'audio/opus',
  }
  return extension ? mimeTypes[extension] : undefined
}
