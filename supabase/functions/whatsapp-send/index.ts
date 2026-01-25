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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      }
    }

    // Handle get_state action (for connection status check)
    if (payload?.action === 'get_state' || payload?.action === 'test_connection') {
      if (!organizationId) {
        return errorResponse('Organization not found', 401);
      }

      const { data: messengerSettings, error: settingsError } = await supabase
        .from('messenger_settings')
        .select('settings, is_enabled')
        .eq('organization_id', organizationId)
        .eq('messenger_type', 'whatsapp')
        .maybeSingle();

      if (settingsError || !messengerSettings?.settings) {
        return errorResponse('WhatsApp not configured for your organization', 400);
      }

      const settings = messengerSettings.settings as MessengerSettings;
      const greenApiUrl = settings.apiUrl || 'https://api.green-api.com';
      const greenApiIdInstance = settings.instanceId;
      const greenApiToken = settings.apiToken;

      if (!greenApiIdInstance || !greenApiToken) {
        return errorResponse('Missing Green API credentials in organization settings', 400);
      }

      try {
        const state = await getInstanceState(greenApiUrl, greenApiIdInstance, greenApiToken);
        const stateValue = state?.stateInstance || state?.state || state?.status;
        const authorized = String(stateValue || '').toLowerCase() === 'authorized';
        
        if (payload?.action === 'test_connection') {
          const message = authorized
            ? 'Instance authorized'
            : (state?.error === 'NON_JSON_RESPONSE'
                ? 'Green-API returned non-JSON (check API URL)'
                : `State: ${stateValue ?? 'unknown'}`);
          return successResponse({ success: authorized, state, message } as unknown as Record<string, unknown>);
        }

        return successResponse({ 
          success: authorized, 
          state,
          stateInstance: stateValue
        } as unknown as Record<string, unknown>);
      } catch (e: unknown) {
        return errorResponse(getErrorMessage(e), 500);
      }
    }

    const { clientId, message, phoneNumber, fileUrl, fileName, phoneId } = payload as WhatsAppSendRequest;
    
    if (!clientId) {
      return errorResponse('clientId is required', 400);
    }
    
    console.log('Sending message:', { clientId, message, phoneNumber, fileUrl, fileName, phoneId });

    // Получаем данные клиента
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      throw new Error(`Client not found: ${clientError?.message}`);
    }

    // Use client's organization_id
    organizationId = client.organization_id as string;

    // Get WhatsApp settings from messenger_settings (per-organization)
    const { data: messengerSettings, error: settingsError } = await supabase
      .from('messenger_settings')
      .select('settings, is_enabled')
      .eq('organization_id', organizationId)
      .eq('messenger_type', 'whatsapp')
      .maybeSingle();

    if (settingsError) {
      console.error('Error fetching WhatsApp settings:', settingsError);
      throw new Error('Failed to fetch WhatsApp settings');
    }

    if (!messengerSettings || !messengerSettings.is_enabled) {
      throw new Error('WhatsApp integration not configured or disabled for this organization');
    }

    const settings = messengerSettings.settings as MessengerSettings;
    const greenApiUrl = settings.apiUrl || 'https://api.green-api.com';
    const greenApiIdInstance = settings.instanceId;
    const greenApiToken = settings.apiToken;

    if (!greenApiIdInstance || !greenApiToken) {
      throw new Error('WhatsApp credentials not configured (instanceId or apiToken missing)');
    }

    // Определяем chat ID для WhatsApp
    let chatId: string | null = null;
    
    // Priority 1: Use specified phone number's chat ID
    if (phoneId) {
      const { data: phoneRecord } = await supabase
        .from('client_phone_numbers')
        .select('whatsapp_chat_id, phone')
        .eq('id', phoneId)
        .eq('client_id', clientId)
        .maybeSingle();
      
      if (phoneRecord) {
        chatId = phoneRecord.whatsapp_chat_id as string | null;
        if (!chatId && phoneRecord.phone) {
          const cleanPhone = (phoneRecord.phone as string).replace(/[^\d]/g, '');
          chatId = `${cleanPhone}@c.us`;
        }
        console.log('Using specified phone:', phoneId, 'chatId:', chatId);
      }
    }
    
    // Priority 2: Use primary phone number's chat ID
    if (!chatId) {
      const { data: primaryPhone } = await supabase
        .from('client_phone_numbers')
        .select('whatsapp_chat_id, phone')
        .eq('client_id', clientId)
        .eq('is_primary', true)
        .maybeSingle();
      
      if (primaryPhone) {
        chatId = primaryPhone.whatsapp_chat_id as string | null;
        if (!chatId && primaryPhone.phone) {
          const cleanPhone = (primaryPhone.phone as string).replace(/[^\d]/g, '');
          chatId = `${cleanPhone}@c.us`;
        }
        console.log('Using primary phone chatId:', chatId);
      }
    }
    
    // Priority 3: Fall back to client's whatsapp_chat_id (backward compatibility)
    if (!chatId) {
      chatId = client.whatsapp_chat_id as string | null;
    }
    
    // Priority 4: Use provided phone number or client phone
    if (!chatId) {
      let phone = phoneNumber || (client.phone as string | undefined);
      
      // Если номера нет, ищем в client_phone_numbers
      if (!phone) {
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
        throw new Error('No phone number available for client');
      }
      
      // Форматируем номер для WhatsApp (убираем + и другие символы)
      const cleanPhone = phone.replace(/[^\d]/g, '');
      chatId = `${cleanPhone}@c.us`;
      
      // Сохраняем chat ID в базе данных
      await supabase
        .from('clients')
        .update({ whatsapp_chat_id: chatId })
        .eq('id', clientId);
    }

    let greenApiResponse: GreenAPIResponse;

    // Отправляем сообщение или файл
    if (fileUrl) {
      greenApiResponse = await sendFileMessage(greenApiUrl, greenApiIdInstance, greenApiToken, chatId, fileUrl, fileName, message);
    } else {
      greenApiResponse = await sendTextMessage(greenApiUrl, greenApiIdInstance, greenApiToken, chatId, message);
    }

    console.log('Green-API response:', greenApiResponse);

    // Сохраняем сообщение в базу данных
    const messageStatus = greenApiResponse.error ? 'failed' : 'queued';
    
    const { data: savedMessage, error: saveError } = await supabase
      .from('chat_messages')
      .insert({
        client_id: clientId,
        organization_id: client.organization_id,
        message_text: message,
        message_type: 'manager',
        messenger_type: 'whatsapp',
        message_status: messageStatus,
        external_message_id: greenApiResponse.idMessage,
        is_outgoing: true,
        is_read: true,
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileUrl ? getFileTypeFromUrl(fileUrl) : null
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving message to database:', saveError);
      throw saveError;
    }

    // Обновляем время последнего сообщения у клиента
    await supabase
      .from('clients')
      .update({ 
        last_message_at: new Date().toISOString()
      })
      .eq('id', clientId);

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
