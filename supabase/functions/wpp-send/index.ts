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
  clientId?: string;  // Now optional if phoneNumber is provided
  teacherId?: string; // For sending to teachers directly
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
    const { clientId, teacherId, message, text, phoneNumber, fileUrl, fileName, fileType } = payload
    const messageText = message || text || ''
    
    console.log('Sending WPP message:', { clientId, teacherId, messageText: messageText.substring(0, 50), phoneNumber, fileUrl })

    // Validate: either clientId or (teacherId + phoneNumber) must be provided
    if (!clientId && !teacherId && !phoneNumber) {
      return errorResponse('Either clientId or (teacherId + phoneNumber) must be provided', 400)
    }

    // Get client data (skip if sending to teacher directly with phone)
    let client: any = null
    if (clientId) {
      const { data, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()

      if (clientError || !data) {
        return errorResponse(`Client not found: ${clientError?.message}`, 404)
      }
      client = data
    }

    // Determine phone number: explicit phoneNumber > client.phone
    const phone = phoneNumber || client?.phone
    if (!phone) {
      return errorResponse('No phone number available - provide phoneNumber or valid clientId', 400)
    }
    
    // Format phone for WhatsApp API with Russian number normalization
    const to = normalizePhoneForWpp(phone)

    console.log('[wpp-send] Sending to:', to, '(original:', phone, ')')

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
    
    console.log('[wpp-send] Saving message to DB, clientId:', clientId, 'teacherId:', teacherId, 'orgId:', orgId)
    
    // Save message to database with resilient insert
    let savedMessage: any = null
    let saveError: any = null

    // Build insert object - use teacher_id if sending to teacher, otherwise client_id
    const baseInsert: Record<string, any> = {
      organization_id: orgId,
      message_text: messageText,
      is_outgoing: true,
      message_type: 'manager',
      messenger_type: 'whatsapp',
      message_status: messageStatus,
      external_message_id: wppResult.taskId || null,
      is_read: true,
      file_url: fileUrl || null,
      file_name: fileName || null,
      file_type: fileUrl ? getFileTypeFromUrl(fileUrl) : null,
    }

    // Set either client_id or teacher_id
    if (teacherId) {
      baseInsert.teacher_id = teacherId
      baseInsert.client_id = null
    } else if (clientId) {
      baseInsert.client_id = clientId
    }

    const result1 = await supabase
      .from('chat_messages')
      .insert(baseInsert)
      .select()
      .maybeSingle()

    if (result1.error) {
      console.warn('[wpp-send] Full insert failed, trying minimal:', result1.error.message)
      
      // Fallback: minimal columns only
      const minimalInsert: Record<string, any> = {
        organization_id: orgId,
        message_text: messageText,
        is_outgoing: true,
        message_type: 'manager',
        is_read: true,
        external_message_id: wppResult.taskId || null,
      }
      
      if (teacherId) {
        minimalInsert.teacher_id = teacherId
        minimalInsert.client_id = null
      } else if (clientId) {
        minimalInsert.client_id = clientId
      }
      
      const result2 = await supabase
        .from('chat_messages')
        .insert(minimalInsert)
        .select()
        .maybeSingle()
      
      savedMessage = result2.data
      saveError = result2.error
    } else {
      savedMessage = result1.data
    }

    if (saveError) {
      console.error('[wpp-send] Error saving message to database:', JSON.stringify(saveError))
    } else {
      console.log('[wpp-send] Message saved, id:', savedMessage?.id)
    }

    // Update client/teacher last message time
    if (clientId) {
      await supabase
        .from('clients')
        .update({ 
          last_message_at: new Date().toISOString(),
          whatsapp_id: to
        })
        .eq('id', clientId)
    } else if (teacherId) {
      // Update teacher's whatsapp_id if needed
      await supabase
        .from('teachers')
        .update({ 
          whatsapp_id: to
        })
        .eq('id', teacherId)
    }

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

/**
 * Нормализует телефон для WhatsApp API
 * - 9852615056 → 79852615056 (Россия)
 * - 89852615056 → 79852615056 (Россия)
 * - 79852615056 → 79852615056 (Россия)
 * - 380501234567 → 380501234567 (Украина, без изменений)
 */
function normalizePhoneForWpp(phone: string): string {
  // Убираем все кроме цифр
  let cleaned = phone.replace(/\D/g, '')
  
  // Если 11 цифр и начинается с 8 (российский формат) → заменяем на 7
  if (cleaned.length === 11 && cleaned.startsWith('8')) {
    cleaned = '7' + cleaned.substring(1)
  }
  
  // Если 10 цифр и начинается с 9 → добавляем 7 (российский мобильный)
  if (cleaned.length === 10 && cleaned.startsWith('9')) {
    cleaned = '7' + cleaned
  }
  
  return cleaned
}
