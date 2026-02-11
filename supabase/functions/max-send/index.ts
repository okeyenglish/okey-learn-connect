import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import {
  corsHeaders,
  handleCors,
  successResponse,
  errorResponse,
  getErrorMessage,
  type MaxSettings,
  type MaxSendMessageRequest,
  type MaxSendMessageResponse,
} from "../_shared/types.ts";

// Green API base URL for MAX (v3)
const DEFAULT_GREEN_API_URL = 'https://api.green-api.com';
const GREEN_API_URL =
  Deno.env.get('MAX_GREEN_API_URL') ||
  Deno.env.get('GREEN_API_URL') ||
  DEFAULT_GREEN_API_URL;

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Use self-hosted Supabase for DB operations
    const selfHostedUrl = Deno.env.get('SELF_HOSTED_URL') || 'https://api.academyos.ru';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(selfHostedUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Unauthorized', 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return errorResponse('Organization not found', 400);
    }

    const organizationId = profile.organization_id;

    // Smart routing: if we have clientId, try to find integration from last message
    let resolvedIntegrationId: string | null = null;
    const body: MaxSendMessageRequest & { phoneNumber?: string; teacherId?: string; integrationId?: string } = await req.json();
    const { clientId, text, fileUrl, fileName, fileType, phoneId, phoneNumber, teacherId, integrationId } = body;

    if (integrationId) {
      resolvedIntegrationId = integrationId;
    } else if (clientId) {
      const { data: lastMessage } = await supabase
        .from('chat_messages')
        .select('integration_id')
        .eq('client_id', clientId)
        .eq('is_outgoing', false)
        .eq('messenger_type', 'max')
        .not('integration_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastMessage?.integration_id) {
        resolvedIntegrationId = lastMessage.integration_id as string;
        console.log('[max-send] Smart routing: using integration from last message:', resolvedIntegrationId);
      }
    }

    // Get MAX settings - try messenger_integrations first (if integration_id known)
    let instanceId: string | undefined;
    let apiToken: string | undefined;

    if (resolvedIntegrationId) {
      const { data: integration } = await supabase
        .from('messenger_integrations')
        .select('settings')
        .eq('id', resolvedIntegrationId)
        .eq('organization_id', organizationId)
        .eq('is_enabled', true)
        .single();

      if (integration?.settings) {
        const settings = integration.settings as Record<string, unknown>;
        instanceId = settings.instanceId as string | undefined;
        apiToken = settings.apiToken as string | undefined;
        console.log('[max-send] Using settings from messenger_integrations');
      }
    }

    // Fallback to messenger_settings (legacy)
    if (!instanceId || !apiToken) {
      const { data: messengerSettings, error: settingsError } = await supabase
        .from('messenger_settings')
        .select('settings')
        .eq('organization_id', organizationId)
        .eq('messenger_type', 'max')
        .eq('is_enabled', true)
        .single();

      if (settingsError || !messengerSettings) {
        console.error('MAX settings not found:', settingsError);
        return errorResponse('MAX integration not configured', 400);
      }

      const maxSettings = messengerSettings.settings as MaxSettings;
      if (!maxSettings?.instanceId || !maxSettings?.apiToken) {
        return errorResponse('MAX credentials not configured', 400);
      }

      instanceId = maxSettings.instanceId;
      apiToken = maxSettings.apiToken;
    }

    // Validate: either clientId or phoneNumber must be provided
    if (!clientId && !phoneNumber) {
      return errorResponse('clientId or phoneNumber is required', 400);
    }

    if (!text && !fileUrl) {
      return errorResponse('text or fileUrl is required', 400);
    }

    let chatId: string | null = null;
    let resolvedTeacherId: string | null = teacherId || null;
    let resolvedClientId: string | null = clientId || null;

    // Mode 1: Direct phone number (for teacher messages)
    if (phoneNumber && !clientId) {
      const cleanPhone = normalizePhoneForMax(phoneNumber);
      chatId = `${cleanPhone}@c.us`;
      console.log(`[max-send] Direct phone mode: ${phoneNumber} → ${chatId}`);
      
      // Find teacher by phone if teacherId not provided
      if (!resolvedTeacherId) {
        const { data: teacher } = await supabase
          .from('teachers')
          .select('id')
          .ilike('phone', `%${cleanPhone.slice(-10)}`)
          .eq('organization_id', organizationId)
          .maybeSingle();
        if (teacher) {
          resolvedTeacherId = teacher.id;
          console.log(`[max-send] Found teacher by phone: ${resolvedTeacherId}`);
        }
      }
    }
    // Mode 2: Client lookup (existing logic)
    else if (clientId) {
      // Get client info
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, name, max_chat_id, max_user_id, phone')
        .eq('id', clientId)
        .single();

      if (clientError || !client) {
        console.error('Client not found:', clientError);
        return errorResponse('Client not found', 404);
      }

      // Determine chatId for MAX
      // Priority 1: Use specified phone number's chat ID
      if (phoneId) {
        const { data: phoneRecord } = await supabase
          .from('client_phone_numbers')
          .select('max_chat_id, max_user_id, phone')
          .eq('id', phoneId)
          .eq('client_id', clientId)
          .single();
        
        if (phoneRecord) {
          chatId = phoneRecord.max_chat_id;
          if (!chatId && phoneRecord.max_user_id) {
            chatId = String(phoneRecord.max_user_id);
          }
          if (!chatId && phoneRecord.phone) {
            const cleanPhone = normalizePhoneForMax(phoneRecord.phone);
            chatId = `${cleanPhone}@c.us`;
          }
          console.log('Using specified phone:', phoneId, 'chatId:', chatId);
        }
      }
      
      // Priority 2: Use primary phone number's chat ID
      if (!chatId) {
        const { data: primaryPhone } = await supabase
          .from('client_phone_numbers')
          .select('max_chat_id, max_user_id, phone')
          .eq('client_id', clientId)
          .eq('is_primary', true)
          .single();
        
        if (primaryPhone) {
          chatId = primaryPhone.max_chat_id;
          if (!chatId && primaryPhone.max_user_id) {
            chatId = String(primaryPhone.max_user_id);
          }
          if (!chatId && primaryPhone.phone) {
            const cleanPhone = normalizePhoneForMax(primaryPhone.phone);
            chatId = `${cleanPhone}@c.us`;
          }
          console.log('Using primary phone chatId:', chatId);
        }
      }
      
      // Priority 3: Fall back to client's max fields (backward compatibility)
      if (!chatId) {
        chatId = client.max_chat_id;
        if (!chatId && client.max_user_id) {
          chatId = String(client.max_user_id);
        }
      }
      
      // Priority 4: Use client's phone
      if (!chatId && client.phone) {
        const cleanPhone = normalizePhoneForMax(client.phone);
        chatId = `${cleanPhone}@c.us`;
      }
    }

    if (!chatId) {
      return errorResponse('No MAX chat ID or phone number available', 400);
    }

    console.log(`Sending MAX message to chatId: ${chatId}, text length: ${text?.length || 0}`);

    let greenApiResponse;
    let messageId: string;

    if (fileUrl) {
      // Send file via sendFileByUrl
      const apiUrl = `${GREEN_API_URL}/v3/waInstance${instanceId}/sendFileByUrl/${apiToken}`;
      
      const fileBody = {
        chatId,
        urlFile: fileUrl,
        fileName: fileName || 'file',
        caption: text || ''
      };

      console.log('Sending file to MAX:', apiUrl, fileBody);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fileBody)
      });

      const responseText = await response.text();
      console.log('Green API file response text:', responseText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText.substring(0, 200)}`);
      }

      try {
        greenApiResponse = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
      }

      messageId = greenApiResponse.idMessage;
    } else {
      // Send text message
      const apiUrl = `${GREEN_API_URL}/v3/waInstance${instanceId}/sendMessage/${apiToken}`;
      
      const messageBody = {
        chatId,
        message: text
      };

      console.log('Sending message to MAX:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageBody)
      });

      const responseText = await response.text();
      console.log('Green API message response text:', responseText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText.substring(0, 200)}`);
      }

      try {
        greenApiResponse = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
      }

      messageId = greenApiResponse.idMessage;
    }

    // Save message to database
    const messageRecord: Record<string, unknown> = {
      organization_id: organizationId,
      message_text: text || `[Файл: ${fileName || 'file'}]`,
      message_type: 'manager',
      messenger_type: 'max',
      is_outgoing: true,
      is_read: true,
      external_message_id: messageId,
      file_url: fileUrl || null,
      file_name: fileName || null,
      file_type: fileType || null,
      message_status: 'sent'
    };

    // Add client_id or teacher_id based on mode
    if (resolvedClientId) {
      messageRecord.client_id = resolvedClientId;
    }
    if (resolvedTeacherId) {
      messageRecord.metadata = { teacher_id: resolvedTeacherId };
    }

    const { data: savedMessage, error: saveError } = await supabase
      .from('chat_messages')
      .insert(messageRecord)
      .select()
      .single();

    if (saveError) {
      console.error('Error saving message:', saveError);
    }

    // Update client's last_message_at (only if we have a clientId)
    if (resolvedClientId) {
      await supabase
        .from('clients')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', resolvedClientId);
    }

    const response: MaxSendMessageResponse = {
      success: true,
      messageId,
      savedMessageId: savedMessage?.id
    };

    return successResponse(response as unknown as Record<string, unknown>);

  } catch (error: unknown) {
    console.error('Error in max-send:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});

/**
 * Нормализует телефон для MAX API (Green API WhatsApp)
 * - 9852615056 → 79852615056 (Россия)
 * - 89852615056 → 79852615056 (Россия)
 * - 79852615056 → 79852615056 (Россия)
 * - 380501234567 → 380501234567 (Украина, без изменений)
 */
function normalizePhoneForMax(phone: string): string {
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
