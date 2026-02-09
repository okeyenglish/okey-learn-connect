import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import {
  corsHeaders,
  handleCors,
  errorResponse,
  getErrorMessage,
  type TelegramSendRequest,
  type TelegramSendResponse,
  type TelegramSettings,
} from '../_shared/types.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Authorization header required', 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    // Get organization ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      return errorResponse('Organization not found', 404);
    }

    const organizationId = profile.organization_id;

    // Parse body early to get clientId for smart routing
    const body = await req.json() as TelegramSendRequest & { phoneNumber?: string; teacherId?: string };
    const { clientId, text, fileUrl, fileName, fileType, phoneId, phoneNumber, teacherId } = body;

    // === SMART ROUTING: Find integration_id from last incoming message ===
    let resolvedIntegrationId: string | null = null;
    
    // Mode 1: Search by clientId (for client messages)
    if (clientId) {
      const { data: lastMessage } = await supabase
        .from('chat_messages')
        .select('integration_id')
        .eq('client_id', clientId)
        .eq('is_outgoing', false)
        .eq('messenger_type', 'telegram')
        .not('integration_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastMessage?.integration_id) {
        resolvedIntegrationId = lastMessage.integration_id;
        console.log('[telegram-send] Smart routing (client):', resolvedIntegrationId);
      }
    }
    
    // Mode 2: Search by teacherId (for teacher messages)
    if (!resolvedIntegrationId && teacherId) {
      const { data: lastTeacherMessage } = await supabase
        .from('chat_messages')
        .select('integration_id')
        .eq('teacher_id', teacherId)
        .eq('is_outgoing', false)
        .eq('messenger_type', 'telegram')
        .not('integration_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastTeacherMessage?.integration_id) {
        resolvedIntegrationId = lastTeacherMessage.integration_id;
        console.log('[telegram-send] Smart routing (teacher):', resolvedIntegrationId);
      }
    }
    
    // Mode 3: Search by phone → teacher_id (fallback when teacherId not provided)
    if (!resolvedIntegrationId && phoneNumber && !teacherId) {
      const phone10 = phoneNumber.replace(/\D/g, '').slice(-10);
      
      if (phone10.length === 10) {
        const { data: teacher } = await supabase
          .from('teachers')
          .select('id')
          .ilike('phone', `%${phone10}`)
          .eq('organization_id', organizationId)
          .maybeSingle();
        
        if (teacher?.id) {
          const { data: msg } = await supabase
            .from('chat_messages')
            .select('integration_id')
            .eq('teacher_id', teacher.id)
            .eq('is_outgoing', false)
            .eq('messenger_type', 'telegram')
            .not('integration_id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (msg?.integration_id) {
            resolvedIntegrationId = msg.integration_id;
            console.log('[telegram-send] Smart routing (phone→teacher):', resolvedIntegrationId);
          }
        }
      }
    }

    // Build integration query based on smart routing result
    let integrationQuery = supabase
      .from('messenger_integrations')
      .select('id, provider, settings, is_enabled')
      .eq('organization_id', organizationId)
      .eq('messenger_type', 'telegram')
      .eq('is_enabled', true);

    // If smart routing found an integration_id, use it; otherwise fall back to primary
    if (resolvedIntegrationId) {
      integrationQuery = integrationQuery.eq('id', resolvedIntegrationId);
    } else {
      integrationQuery = integrationQuery.eq('is_primary', true);
    }

    const { data: integration, error: integrationError } = await integrationQuery.maybeSingle();

    // If using telegram_crm provider, delegate to telegram-crm-send
    if (integration && integration.provider === 'telegram_crm') {
      console.log('[telegram-send] Routing to telegram-crm-send');
      
      // Forward to telegram-crm-send - let it do its own smart routing if no resolvedIntegrationId
      const crmResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/telegram-crm-send`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...body,
          // Only pass integrationId if we found it via smart routing, otherwise let telegram-crm-send find it
          ...(resolvedIntegrationId ? { integrationId: resolvedIntegrationId } : {}),
        }),
      });

      const crmResult = await crmResponse.json();
      return new Response(
        JSON.stringify(crmResult),
        { 
          status: crmResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fall back to legacy messenger_settings or wappi provider
    let profileId: string | undefined;
    let wappiApiToken: string | undefined;

    if (integration && integration.provider === 'wappi') {
      // Use wappi settings from messenger_integrations
      const settings = integration.settings as TelegramSettings | null;
      profileId = settings?.profileId;
      wappiApiToken = settings?.apiToken;
    } else {
      // Legacy: Get from messenger_settings
      const { data: messengerSettings, error: settingsError } = await supabase
        .from('messenger_settings')
        .select('settings, is_enabled')
        .eq('organization_id', organizationId)
        .eq('messenger_type', 'telegram')
        .maybeSingle();

      if (settingsError) {
        console.error('Error fetching Telegram settings:', settingsError);
        return errorResponse('Failed to fetch Telegram settings', 500);
      }

      if (!messengerSettings || !messengerSettings.is_enabled) {
        return errorResponse('Telegram integration not configured or disabled', 400);
      }

      const settings = messengerSettings.settings as TelegramSettings | null;
      profileId = settings?.profileId;
      wappiApiToken = settings?.apiToken;
    }

    if (!profileId || !wappiApiToken) {
      return errorResponse('Telegram Profile ID or API Token not configured', 400);
    }

    // body, clientId, text, etc. already parsed above for smart routing

    // Validate: either clientId or phoneNumber must be provided
    if (!clientId && !phoneNumber) {
      return errorResponse('clientId or phoneNumber is required', 400);
    }

    let resolvedTeacherId: string | null = teacherId || null;
    let resolvedClientId: string | null = clientId || null;
    let client: { telegram_chat_id?: string | null; telegram_user_id?: string | null; phone?: string | null; name?: string | null } | null = null;

    // Mode 1: Client lookup (when clientId provided)
    if (clientId) {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('telegram_chat_id, telegram_user_id, phone, name')
        .eq('id', clientId)
        .eq('organization_id', organizationId)
        .single();

      if (clientError || !clientData) {
        return errorResponse('Client not found', 404);
      }
      client = clientData;
    }

    // Helper function to normalize phone for Wappi (digits only, with Russian +7 prefix)
    function normalizePhone(phone: string | null | undefined): string | null {
      if (!phone) return null;
      
      // Remove all non-digit characters
      let digits = phone.replace(/\D/g, '');
      
      // Если 11 цифр и начинается с 8 (российский формат) → заменяем на 7
      if (digits.length === 11 && digits.startsWith('8')) {
        digits = '7' + digits.substring(1);
      }
      
      // Если 10 цифр и начинается с 9 → добавляем 7 (российский мобильный)
      if (digits.length === 10 && digits.startsWith('9')) {
        digits = '7' + digits;
      }
      
      // Return null if too short after normalization
      return digits.length >= 10 ? digits : null;
    }

    // Try to get chat ID from specified phone number first, with phone fallback
    let recipient: string | null = null;
    let recipientSource = 'none';

    // Mode 2: Direct phone number (for teacher messages)
    if (phoneNumber && !clientId) {
      recipient = normalizePhone(phoneNumber);
      recipientSource = 'direct phoneNumber';
      console.log(`[telegram-send] Direct phone mode: ${phoneNumber} → ${recipient}`);
      
      // Find teacher by phone if teacherId not provided
      if (!resolvedTeacherId && recipient) {
        const { data: teacher } = await supabase
          .from('teachers')
          .select('id')
          .ilike('phone', `%${recipient.slice(-10)}`)
          .eq('organization_id', organizationId)
          .maybeSingle();
        if (teacher) {
          resolvedTeacherId = teacher.id;
          console.log(`[telegram-send] Found teacher by phone: ${resolvedTeacherId}`);
        }
      }
    }
    // Client mode: lookup by phoneId, primary phone, or client fields
    else if (clientId && client) {
      if (phoneId) {
        // Get chat ID from specific phone number
        const { data: phoneRecord } = await supabase
          .from('client_phone_numbers')
          .select('telegram_chat_id, telegram_user_id, telegram_username, phone_number')
          .eq('id', phoneId)
          .eq('client_id', clientId)
          .single();

        if (phoneRecord) {
          console.log('[telegram-send] Phone record found:', {
            telegram_chat_id: phoneRecord.telegram_chat_id,
            telegram_user_id: phoneRecord.telegram_user_id,
            telegram_username: phoneRecord.telegram_username,
            phone_number: phoneRecord.phone_number
          });
          
          // Priority: chat_id > user_id > username > phone
          if (phoneRecord.telegram_chat_id) {
            recipient = phoneRecord.telegram_chat_id;
            recipientSource = 'telegram_chat_id (phoneRecord)';
          } else if (phoneRecord.telegram_user_id) {
            recipient = phoneRecord.telegram_user_id.toString();
            recipientSource = 'telegram_user_id (phoneRecord)';
          } else if (phoneRecord.telegram_username) {
            recipient = phoneRecord.telegram_username;
            recipientSource = 'telegram_username (phoneRecord)';
          } else {
            recipient = normalizePhone(phoneRecord.phone_number);
            recipientSource = 'phone_number (phoneRecord fallback)';
          }
        }
      }

      // If no recipient from phoneId, try primary phone number
      if (!recipient) {
        const { data: primaryPhone } = await supabase
          .from('client_phone_numbers')
          .select('telegram_chat_id, telegram_user_id, telegram_username, phone_number')
          .eq('client_id', clientId)
          .eq('is_primary', true)
          .maybeSingle();

        if (primaryPhone) {
          console.log('[telegram-send] Primary phone found:', {
            telegram_chat_id: primaryPhone.telegram_chat_id,
            telegram_user_id: primaryPhone.telegram_user_id,
            telegram_username: primaryPhone.telegram_username,
            phone_number: primaryPhone.phone_number
          });
          
          if (primaryPhone.telegram_chat_id) {
            recipient = primaryPhone.telegram_chat_id;
            recipientSource = 'telegram_chat_id (primary)';
          } else if (primaryPhone.telegram_user_id) {
            recipient = primaryPhone.telegram_user_id.toString();
            recipientSource = 'telegram_user_id (primary)';
          } else if (primaryPhone.telegram_username) {
            recipient = primaryPhone.telegram_username;
            recipientSource = 'telegram_username (primary)';
          } else {
            recipient = normalizePhone(primaryPhone.phone_number);
            recipientSource = 'phone_number (primary fallback)';
          }
        }
      }

      // Fallback to client's telegram fields or phone (backward compatibility)
      if (!recipient) {
        console.log('[telegram-send] Client fields:', {
          telegram_chat_id: client.telegram_chat_id,
          telegram_user_id: client.telegram_user_id,
          phone: client.phone
        });
        
        if (client.telegram_chat_id) {
          recipient = client.telegram_chat_id;
          recipientSource = 'telegram_chat_id (client)';
        } else if (client.telegram_user_id) {
          recipient = client.telegram_user_id.toString();
          recipientSource = 'telegram_user_id (client)';
        } else {
          recipient = normalizePhone(client.phone);
          recipientSource = 'phone (client fallback)';
        }
      }
    }
    
    if (!recipient) {
      const response: TelegramSendResponse = { 
        success: false,
        error: 'У клиента нет Telegram ID и номера телефона для отправки',
        code: 'NO_TELEGRAM_CONTACT'
      };
      return new Response(
        JSON.stringify(response),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[telegram-send] Final recipient: ${recipient} (source: ${recipientSource})`);
    console.log(`[telegram-send] ⚠️ IMPORTANT: If using phone number, Wappi may fail with "peer not found" unless contact is in phone book`);

    // Send message via Wappi.pro using per-organization apiToken
    let sendResult: { success: boolean; messageId?: string; error?: string };
    if (fileUrl) {
      sendResult = await sendFileMessage(profileId, recipient, fileUrl, text || '', wappiApiToken);
    } else if (text) {
      sendResult = await sendTextMessage(profileId, recipient, text, wappiApiToken);
    } else {
      return errorResponse('Message text or file is required', 400);
    }

    if (!sendResult.success) {
      // Check for "peer not found" error and provide user-friendly message
      const errorMsg = sendResult.error || 'Failed to send message';
      const isPeerNotFound = errorMsg.toLowerCase().includes('peer not found') || 
                              errorMsg.toLowerCase().includes('peer_not_found') ||
                              errorMsg.toLowerCase().includes('no peer');
      
      if (isPeerNotFound) {
        const response: TelegramSendResponse = { 
          success: false,
          error: 'Клиент не найден в Telegram. Попросите клиента написать вам первым, чтобы установить связь.',
          code: 'PEER_NOT_FOUND'
        };
        console.error('[telegram-send] Peer not found error. Client needs to message first.');
        return new Response(
          JSON.stringify(response),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return errorResponse(errorMsg, 500);
    }

    // Save message to database - message_type is 'manager' for outgoing messages
    const contentType = fileUrl ? getMessageTypeFromFile(fileType) : 'text';
    
    const messageRecord: Record<string, unknown> = {
      organization_id: organizationId,
      message_text: text || (fileUrl ? '[Файл]' : ''),
      message_type: 'manager', // outgoing message from manager
      messenger_type: 'telegram',
      message_status: 'sent', // Use 'message_status' field for delivery tracking
      is_outgoing: true,
      is_read: true,
      external_message_id: sendResult.messageId,
      file_url: fileUrl,
      file_name: fileName,
      file_type: fileType || contentType // store content type
    };

    // Add client_id or teacher_id based on mode
    if (resolvedClientId) {
      messageRecord.client_id = resolvedClientId;
    }
    if (resolvedTeacherId) {
      messageRecord.teacher_id = resolvedTeacherId;
    }
    
    const { data: savedMessage, error: saveError } = await supabase
      .from('chat_messages')
      .insert(messageRecord)
      .select('id')
      .single();

    if (saveError) {
      console.error('Error saving sent message:', saveError);
    }

    // Update client's last_message_at (only if we have a clientId)
    if (resolvedClientId) {
      await supabase
        .from('clients')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', resolvedClientId);
    }

    const response: TelegramSendResponse = { 
      success: true, 
      messageId: sendResult.messageId,
      savedMessageId: savedMessage?.id
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Telegram send error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});

async function sendTextMessage(
  profileId: string,
  recipient: string,
  text: string,
  apiToken: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const url = `https://wappi.pro/tapi/sync/message/send?profile_id=${profileId}`;
  // Removed parse_mode: 'MarkdownV2' - it causes API errors when text contains unescaped special chars
  return await sendMessage(url, apiToken, { recipient, body: text }, 'text');
}

async function sendFileMessage(
  profileId: string,
  recipient: string,
  fileUrl: string,
  caption: string,
  apiToken: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const url = `https://wappi.pro/tapi/sync/message/file/url/send?profile_id=${profileId}`;
  // Removed parse_mode: 'MarkdownV2' - it causes API errors when caption contains unescaped special chars
  const body: Record<string, unknown> = { recipient, url: fileUrl };
  if (caption) {
    body.caption = caption;
  }
  return await sendMessage(url, apiToken, body, 'file');
}

async function sendMessage(
  url: string,
  apiToken: string,
  body: Record<string, unknown>,
  kind: 'text' | 'file'
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  console.log(`[telegram-send] Sending ${kind} message:`, body);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: apiToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    let data: { status?: string; detail?: string; message_id?: string; id?: string } | null = null;
    try {
      data = await response.json();
    } catch {
      const text = await response.text().catch(() => '');
      data = { detail: text || `HTTP ${response.status}` };
    }

    console.log(`[telegram-send] Response:`, data);

    if (response.ok && data?.status !== 'error') {
      return {
        success: true,
        messageId: data?.message_id || data?.id,
      };
    }

    return {
      success: false,
      error: data?.detail || `HTTP ${response.status}`,
    };
  } catch (err: unknown) {
    console.error(`[telegram-send] ${kind} message failed:`, err);
    return {
      success: false,
      error: getErrorMessage(err),
    };
  }
}

function getMessageTypeFromFile(fileType: string | undefined): string {
  if (!fileType) return 'document';
  
  if (fileType.startsWith('image/')) return 'image';
  if (fileType.startsWith('video/')) return 'video';
  if (fileType.startsWith('audio/')) return 'audio';
  
  return 'document';
}
