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

    // Get Telegram settings from messenger_settings (per-organization)
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
    const profileId = settings?.profileId;
    const wappiApiToken = settings?.apiToken;

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

    // Try to get chat ID from specified phone number first
    let recipient: string | null = null;
    let usePhoneNumber = false;
    
    if (phoneId) {
      // Get chat ID from specific phone number
      const { data: phoneRecord } = await supabase
        .from('client_phone_numbers')
        .select('telegram_chat_id, telegram_user_id, phone')
        .eq('id', phoneId)
        .eq('client_id', clientId)
        .single();
      
      if (phoneRecord) {
        recipient = phoneRecord.telegram_chat_id || phoneRecord.telegram_user_id?.toString();
        if (!recipient && phoneRecord.phone) {
          const cleanPhone = phoneRecord.phone.replace(/\D/g, '');
          if (cleanPhone) {
            recipient = cleanPhone;
            usePhoneNumber = true;
          }
        }
        console.log('Using specified phone:', phoneId, 'recipient:', recipient);
      }
    }
    
    // If no recipient from phoneId, try primary phone number
    if (!recipient) {
      const { data: primaryPhone } = await supabase
        .from('client_phone_numbers')
        .select('telegram_chat_id, telegram_user_id, phone')
        .eq('client_id', clientId)
        .eq('is_primary', true)
        .maybeSingle();
      
      if (primaryPhone) {
        recipient = primaryPhone.telegram_chat_id || primaryPhone.telegram_user_id?.toString();
        if (!recipient && primaryPhone.phone) {
          const cleanPhone = primaryPhone.phone.replace(/\D/g, '');
          if (cleanPhone) {
            recipient = cleanPhone;
            usePhoneNumber = true;
          }
        }
        console.log('Using primary phone recipient:', recipient);
      }
    }
    
    // Fallback to client's telegram fields (backward compatibility)
    if (!recipient) {
      recipient = client.telegram_chat_id || client.telegram_user_id?.toString();
    }
    
    // Final fallback: use client's phone number
    if (!recipient && client.phone) {
      const cleanPhone = client.phone.replace(/\D/g, '');
      if (cleanPhone) {
        recipient = cleanPhone;
        usePhoneNumber = true;
        console.log('Using client phone number as recipient:', recipient);
      }
    }
    
    if (!recipient) {
      const response: TelegramSendResponse = { 
        success: false,
        error: 'У клиента нет Telegram и номера телефона',
        code: 'NO_TELEGRAM_CONTACT'
      };
      return new Response(
        JSON.stringify(response),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Sending Telegram message to:', recipient, 'usePhoneNumber:', usePhoneNumber);

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
      return errorResponse(sendResult.error || 'Failed to send message', 500);
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
        is_outgoing: true,
        is_read: true,
        external_message_id: sendResult.messageId,
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileType || contentType, // store content type
        message_status: 'sent'
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
  // Telegram formatting requires parse mode; without it, * _ ~ __ are shown as plain text
  return await sendMessage(url, apiToken, { recipient, body: text, parse_mode: 'MarkdownV2' }, 'text');
}

async function sendFileMessage(
  profileId: string,
  recipient: string,
  fileUrl: string,
  caption: string,
  apiToken: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const url = `https://wappi.pro/tapi/sync/message/file/url/send?profile_id=${profileId}`;
  const body: Record<string, unknown> = { recipient, url: fileUrl, parse_mode: 'MarkdownV2' };
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
