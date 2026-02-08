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

    // First, check messenger_integrations for multi-account support
    const { data: integration, error: integrationError } = await supabase
      .from('messenger_integrations')
      .select('id, provider, settings, is_enabled')
      .eq('organization_id', organizationId)
      .eq('messenger_type', 'telegram')
      .eq('is_primary', true)
      .eq('is_enabled', true)
      .maybeSingle();

    // If using telegram_crm provider, delegate to telegram-crm-send
    if (integration && integration.provider === 'telegram_crm') {
      console.log('[telegram-send] Routing to telegram-crm-send');
      
      const body = await req.json();
      
      // Forward to telegram-crm-send
      const crmResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/telegram-crm-send`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...body,
          integrationId: integration.id,
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

    const body = await req.json() as TelegramSendRequest;
    const { clientId, text, fileUrl, fileName, fileType, phoneId } = body;

    if (!clientId) {
      return errorResponse('Client ID is required', 400);
    }

    // Get client with phone number
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('telegram_chat_id, telegram_user_id, phone, name')
      .eq('id', clientId)
      .eq('organization_id', organizationId)
      .single();

    if (clientError || !client) {
      return errorResponse('Client not found', 404);
    }

    // Helper function to normalize phone for Wappi (digits only)
    function normalizePhone(phone: string | null | undefined): string | null {
      if (!phone) return null;
      // Remove all non-digit characters
      const digits = phone.replace(/\D/g, '');
      // Return null if empty or too short
      return digits.length >= 10 ? digits : null;
    }

    // Try to get chat ID from specified phone number first, with phone fallback
    let recipient: string | null = null;
    let recipientSource = 'none';

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
    
    const { data: savedMessage, error: saveError } = await supabase
      .from('chat_messages')
      .insert({
        client_id: clientId,
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
      })
      .select('id')
      .single();

    if (saveError) {
      console.error('Error saving sent message:', saveError);
    }

    // Update client's last_message_at
    await supabase
      .from('clients')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', clientId);

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
