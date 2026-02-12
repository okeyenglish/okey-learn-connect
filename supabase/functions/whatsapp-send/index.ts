import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import {
  corsHeaders,
  handleCors,
  successResponse,
  errorResponse,
  getErrorMessage,
  type WhatsAppSendRequest,
  type WhatsAppSendResponse,
  type MessengerSettings,
} from '../_shared/types.ts';

interface GreenAPIResponse {
  idMessage?: string;
  error?: string;
  message?: string;
}

interface InstanceStateResponse {
  stateInstance?: string;
  state?: string;
  status?: string;
  error?: string;
  raw?: string;
}

interface GreenApiSettings {
  source: 'messenger_integrations' | 'messenger_settings';
  integrationId?: string;
  instanceId: string;
  apiToken: string;
  apiUrl: string;
}

/**
 * Smart routing: Find the integration ID from client's last incoming message
 */
async function getSmartRoutingIntegrationId(
  supabase: ReturnType<typeof createClient>,
  clientId: string
): Promise<string | null> {
  const { data: lastMessage } = await supabase
    .from('chat_messages')
    .select('metadata')
    .eq('client_id', clientId)
    .eq('is_outgoing', false)
    .eq('messenger_type', 'whatsapp')
    .not('metadata->integration_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastMessage?.integration_id) {
    console.log('[whatsapp-send] Smart routing: found integration from last message:', lastMessage.integration_id);
    return lastMessage.integration_id as string;
  }
  return null;
}

/**
 * Get GreenAPI settings from messenger_integrations (priority) or messenger_settings (fallback)
 * Logic:
 * - If integrationId is provided, use that specific integration
 * - Otherwise, prefer is_primary=true integration
 * - Fallback to first active integration by created_at
 * - Last fallback to messenger_settings table
 */
async function getGreenApiSettings(
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  integrationId?: string
): Promise<GreenApiSettings | null> {
  console.log('[whatsapp-send] Getting GreenAPI settings for org:', organizationId, 'integrationId:', integrationId);

  // 1. Search in messenger_integrations (new multi-account table)
  let integrationQuery = supabase
    .from('messenger_integrations')
    .select('id, settings, is_primary')
    .eq('organization_id', organizationId)
    .eq('messenger_type', 'whatsapp')
    .eq('provider', 'green_api')
    .eq('is_enabled', true);

  if (integrationId) {
    // Explicitly selected integration
    integrationQuery = integrationQuery.eq('id', integrationId);
  } else {
    // Priority: is_primary first, then by created_at
    integrationQuery = integrationQuery
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });
  }

  const { data: integration, error: intError } = await integrationQuery.limit(1).maybeSingle();

  if (intError) {
    console.error('[whatsapp-send] Error fetching messenger_integrations:', intError);
  }

  if (integration?.settings) {
    const settings = integration.settings as Record<string, unknown>;
    const instanceId = settings.instanceId as string | undefined;
    const apiToken = settings.apiToken as string | undefined;
    
    if (instanceId && apiToken) {
      console.log('[whatsapp-send] ✓ Found settings in messenger_integrations:', integration.id, 'is_primary:', integration.is_primary);
      return {
        source: 'messenger_integrations',
        integrationId: integration.id as string,
        instanceId,
        apiToken,
        apiUrl: (settings.apiUrl as string) || 'https://api.green-api.com',
      };
    }
  }

  // 2. Fallback to messenger_settings (legacy table)
  console.log('[whatsapp-send] No integration found, trying messenger_settings fallback...');
  const { data: messengerSettings, error: settingsError } = await supabase
    .from('messenger_settings')
    .select('settings, is_enabled')
    .eq('organization_id', organizationId)
    .eq('messenger_type', 'whatsapp')
    .maybeSingle();

  if (settingsError) {
    console.error('[whatsapp-send] Error fetching messenger_settings:', settingsError);
  }

  if (messengerSettings?.is_enabled && messengerSettings?.settings) {
    const settings = messengerSettings.settings as MessengerSettings;
    if (settings.instanceId && settings.apiToken) {
      console.log('[whatsapp-send] ✓ Found settings in messenger_settings (legacy)');
      return {
        source: 'messenger_settings',
        instanceId: settings.instanceId,
        apiToken: settings.apiToken,
        apiUrl: settings.apiUrl || 'https://api.green-api.com',
      };
    }
  }

  console.log('[whatsapp-send] No GreenAPI settings found');
  return null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Use self-hosted Supabase for DB operations
    const selfHostedUrl = Deno.env.get('SELF_HOSTED_URL') || 'https://api.academyos.ru';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(selfHostedUrl, supabaseServiceKey);

    const payload = await req.json().catch(() => ({} as Record<string, unknown>));

    // Get user from auth header for authenticated requests
    const authHeader = req.headers.get('Authorization');
    let organizationId: string | null = null;

    if (authHeader) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (!authError && user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();
        
        organizationId = profile?.organization_id as string | null;
        console.log('[whatsapp-send] User auth succeeded, orgId:', organizationId);
      } else {
        // Fallback: service role call from other Edge Functions (e.g., tbank-webhook)
        // Will get organization_id from payload.organizationId or client lookup below
        console.log('[whatsapp-send] User auth failed, will use service role fallback');
      }
    }

    // Handle get_state action (for connection status check)
    if (payload?.action === 'get_state' || payload?.action === 'test_connection') {
      if (!organizationId) {
        return errorResponse('Organization not found', 401);
      }

      const greenApiSettings = await getGreenApiSettings(supabase, organizationId, payload?.integrationId as string | undefined);

      if (!greenApiSettings) {
        return errorResponse('WhatsApp not configured for your organization', 400);
      }

      try {
        const state = await getInstanceState(greenApiSettings.apiUrl, greenApiSettings.instanceId, greenApiSettings.apiToken);
        const stateValue = state?.stateInstance || state?.state || state?.status;
        const authorized = String(stateValue || '').toLowerCase() === 'authorized';
        
        if (payload?.action === 'test_connection') {
          const message = authorized
            ? 'Instance authorized'
            : (state?.error === 'NON_JSON_RESPONSE'
                ? 'Green-API returned non-JSON (check API URL)'
                : `State: ${stateValue ?? 'unknown'}`);
          return successResponse({ 
            success: authorized, 
            state, 
            message,
            source: greenApiSettings.source,
            integrationId: greenApiSettings.integrationId
          } as unknown as Record<string, unknown>);
        }

        return successResponse({ 
          success: authorized, 
          state,
          stateInstance: stateValue,
          source: greenApiSettings.source,
          integrationId: greenApiSettings.integrationId
        } as unknown as Record<string, unknown>);
      } catch (e: unknown) {
        return errorResponse(getErrorMessage(e), 500);
      }
    }

    const { clientId, message, phoneNumber, fileUrl, fileName, phoneId, integrationId, organizationId: bodyOrgId } = payload as WhatsAppSendRequest & { integrationId?: string; organizationId?: string };
    
    // For service role calls (e.g., from tbank-webhook), clientId may be optional if we have phone + organizationId
    if (!clientId && !phoneNumber) {
      return errorResponse('clientId or phoneNumber is required', 400);
    }
    
    // Use organizationId from body for service role calls if not authenticated
    if (!organizationId && bodyOrgId) {
      organizationId = bodyOrgId;
      console.log('[whatsapp-send] Using organizationId from body:', organizationId);
    }
    
    console.log('[whatsapp-send] Sending message:', { clientId, message, phoneNumber, fileUrl, fileName, phoneId, integrationId, organizationId });

    // Получаем данные клиента (если clientId указан)
    let client: Record<string, unknown> | null = null;
    if (clientId) {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError || !clientData) {
        throw new Error(`Client not found: ${clientError?.message}`);
      }
      client = clientData;
      // Use client's organization_id if not provided
      if (!organizationId) {
        organizationId = client.organization_id as string;
      }
    }

    // Validate we have organization_id at this point
    if (!organizationId) {
      return errorResponse('organizationId is required for service role calls without clientId', 400);
    }

    // Smart routing: if no integrationId provided and we have clientId, try to find from last message
    let resolvedIntegrationId = integrationId;
    if (!resolvedIntegrationId && clientId) {
      resolvedIntegrationId = await getSmartRoutingIntegrationId(supabase, clientId) || undefined;
    }

    // Get WhatsApp settings (new multi-account logic)
    const greenApiSettings = await getGreenApiSettings(supabase, organizationId, resolvedIntegrationId);

    if (!greenApiSettings) {
      throw new Error('WhatsApp integration not configured or disabled for this organization');
    }

    const { apiUrl: greenApiUrl, instanceId: greenApiIdInstance, apiToken: greenApiToken } = greenApiSettings;
    console.log('[whatsapp-send] Using settings from:', greenApiSettings.source, 'integrationId:', greenApiSettings.integrationId);

    // Определяем chat ID для WhatsApp
    let chatId: string | null = null;
    
    // Priority 1: Use specified phone number's chat ID (only if clientId provided)
    if (phoneId && clientId) {
      const { data: phoneRecord } = await supabase
        .from('client_phone_numbers')
        .select('whatsapp_chat_id, phone')
        .eq('id', phoneId)
        .eq('client_id', clientId)
        .maybeSingle();
      
      if (phoneRecord) {
        chatId = phoneRecord.whatsapp_chat_id as string | null;
        if (!chatId && phoneRecord.phone) {
          const cleanPhone = normalizePhoneForWhatsApp(phoneRecord.phone as string);
          chatId = `${cleanPhone}@c.us`;
        }
        console.log('Using specified phone:', phoneId, 'chatId:', chatId);
      }
    }
    
    // Priority 2: Use primary phone number's chat ID (only if clientId provided)
    if (!chatId && clientId) {
      const { data: primaryPhone } = await supabase
        .from('client_phone_numbers')
        .select('whatsapp_chat_id, phone')
        .eq('client_id', clientId)
        .eq('is_primary', true)
        .maybeSingle();
      
      if (primaryPhone) {
        chatId = primaryPhone.whatsapp_chat_id as string | null;
        if (!chatId && primaryPhone.phone) {
          const cleanPhone = normalizePhoneForWhatsApp(primaryPhone.phone as string);
          chatId = `${cleanPhone}@c.us`;
        }
        console.log('Using primary phone chatId:', chatId);
      }
    }
    
    // Priority 3: Fall back to client's whatsapp_chat_id (backward compatibility)
    if (!chatId && client) {
      chatId = client.whatsapp_chat_id as string | null;
    }
    
    // Priority 4: Use provided phone number or client phone
    if (!chatId) {
      let phone = phoneNumber || (client?.phone as string | undefined);
      
      // Если номера нет и есть clientId, ищем в client_phone_numbers
      if (!phone && clientId) {
        const { data: phoneNumbers } = await supabase
          .from('client_phone_numbers')
          .select('phone')
          .eq('client_id', clientId)
          .eq('is_whatsapp_enabled', true)
          .limit(1)
          .maybeSingle();
        
        if (!phoneNumbers?.phone) {
          // Пробуем получить любой номер
          const { data: anyPhone } = await supabase
            .from('client_phone_numbers')
            .select('phone')
            .eq('client_id', clientId)
            .limit(1)
            .maybeSingle();
          
          phone = anyPhone?.phone as string | undefined;
        } else {
          phone = phoneNumbers.phone as string;
        }
      }
      
      if (!phone) {
        throw new Error('No phone number available - provide phoneNumber or clientId');
      }
      
      // Форматируем номер для WhatsApp с нормализацией российских номеров
      const cleanPhone = normalizePhoneForWhatsApp(phone);
      console.log('[whatsapp-send] Normalized phone:', cleanPhone, '(original:', phone, ')');
      chatId = `${cleanPhone}@c.us`;
      
      // Сохраняем chat ID в базе данных только если есть clientId
      if (clientId) {
        await supabase
          .from('clients')
          .update({ whatsapp_chat_id: chatId })
          .eq('id', clientId);
      }
    }

    let greenApiResponse: GreenAPIResponse;

    // Отправляем сообщение или файл
    if (fileUrl) {
      greenApiResponse = await sendFileMessage(greenApiUrl, greenApiIdInstance, greenApiToken, chatId, fileUrl, fileName, message);
    } else {
      greenApiResponse = await sendTextMessage(greenApiUrl, greenApiIdInstance, greenApiToken, chatId, message);
    }

    console.log('Green-API response:', greenApiResponse);

    // Сохраняем сообщение в базу данных - используем 'sent' сразу при успехе для мгновенной обратной связи
    const messageStatus = greenApiResponse.error ? 'failed' : 'sent';
    
    // Сохраняем сообщение в базу данных только если есть clientId
    let savedMessage: Record<string, unknown> | null = null;
    if (clientId) {
      const { data: savedMsgData, error: saveError } = await supabase
        .from('chat_messages')
        .insert({
          client_id: clientId,
          organization_id: organizationId,
          message_text: message,
          message_type: 'manager',
          messenger_type: 'whatsapp',
          message_status: messageStatus,
          external_message_id: greenApiResponse.idMessage,
          is_outgoing: true,
          is_read: true,
          file_url: fileUrl,
          file_name: fileName,
          file_type: fileUrl ? getFileTypeFromUrl(fileUrl) : null,
          sender_name: payload.senderName || null,
          metadata: { sender_name: payload.senderName || null }
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error saving message to database:', saveError);
        // Don't throw - message was sent successfully, just logging failed
      } else {
        savedMessage = savedMsgData;
      }

      // Обновляем время последнего сообщения у клиента
      await supabase
        .from('clients')
        .update({ 
          last_message_at: new Date().toISOString()
        })
        .eq('id', clientId);
    } else {
      console.log('[whatsapp-send] No clientId, skipping message save to DB');
    }

    const response: WhatsAppSendResponse = {
      success: !greenApiResponse.error,
      messageId: greenApiResponse.idMessage,
      idMessage: greenApiResponse.idMessage,
      savedMessageId: savedMessage?.id
    };

    if (greenApiResponse.error) {
      response.error = greenApiResponse.error;
    }

    return successResponse(response as unknown as Record<string, unknown>);

  } catch (error: unknown) {
    console.error('Error sending message:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});

async function sendTextMessage(
  apiUrl: string,
  instanceId: string,
  apiToken: string,
  chatId: string,
  message?: string
): Promise<GreenAPIResponse> {
  const url = `${apiUrl}/waInstance${instanceId}/sendMessage/${apiToken}`;
  
  console.log('Sending text message to:', chatId);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chatId,
      message
    })
  });

  const text = await response.text();
  let result: GreenAPIResponse;
  
  try {
    result = JSON.parse(text);
  } catch {
    console.error('Green-API returned non-JSON response:', text.substring(0, 200));
    return { error: `Invalid API response: ${text.substring(0, 100)}` };
  }
  
  if (!response.ok) {
    console.error('Green-API error:', result);
    return { error: result.message || 'Failed to send message' };
  }
  
  return result;
}

async function sendFileMessage(
  apiUrl: string,
  instanceId: string,
  apiToken: string,
  chatId: string,
  fileUrl: string,
  fileName?: string,
  caption?: string
): Promise<GreenAPIResponse> {
  const url = `${apiUrl}/waInstance${instanceId}/sendFileByUrl/${apiToken}`;
  
  console.log('Sending file message to:', chatId, 'File:', fileUrl);
  
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
  });

  const text = await response.text();
  let result: GreenAPIResponse;
  
  try {
    result = JSON.parse(text);
  } catch {
    console.error('Green-API returned non-JSON response:', text.substring(0, 200));
    return { error: `Invalid API response: ${text.substring(0, 100)}` };
  }
  
  if (!response.ok) {
    console.error('Green-API error:', result);
    return { error: result.message || 'Failed to send file' };
  }
  
  return result;
}

function getFileTypeFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const extension = pathname.split('.').pop()?.toLowerCase();
    
    if (!extension) return null;
    
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const videoTypes = ['mp4', 'avi', 'mov', 'wmv', 'flv'];
    const audioTypes = ['mp3', 'wav', 'ogg', 'm4a'];
    const documentTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
    
    if (imageTypes.includes(extension)) return 'image';
    if (videoTypes.includes(extension)) return 'video';
    if (audioTypes.includes(extension)) return 'audio';
    if (documentTypes.includes(extension)) return 'document';
    
    return 'file';
  } catch {
    return null;
  }
}

async function getInstanceState(
  apiUrl: string, 
  instanceId: string, 
  apiToken: string
): Promise<InstanceStateResponse> {
  const url = `${apiUrl}/waInstance${instanceId}/getStateInstance/${apiToken}`;
  
  const response = await fetch(url);
  const text = await response.text();
  try {
    return JSON.parse(text) as InstanceStateResponse;
  } catch {
    // Возвращаем "сырое" тело, чтобы увидеть, что именно прислал Green-API
    return { raw: text, error: 'NON_JSON_RESPONSE' };
  }
}

/**
 * Нормализует телефон для WhatsApp API (Green API)
 * - 9852615056 → 79852615056 (Россия)
 * - 89852615056 → 79852615056 (Россия)
 * - 79852615056 → 79852615056 (Россия)
 * - 380501234567 → 380501234567 (Украина, без изменений)
 */
function normalizePhoneForWhatsApp(phone: string): string {
  // Убираем все кроме цифр
  let cleaned = phone.replace(/\D/g, '');
  
  // Если 11 цифр и начинается с 8 (российский формат) → заменяем на 7
  if (cleaned.length === 11 && cleaned.startsWith('8')) {
    cleaned = '7' + cleaned.substring(1);
  }
  
  // Если 10 цифр и начинается с 9 → добавляем 7 (российский мобильный)
  if (cleaned.length === 10 && cleaned.startsWith('9')) {
    cleaned = '7' + cleaned;
  }
  
  return cleaned;
}
