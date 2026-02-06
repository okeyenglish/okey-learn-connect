import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { WppMsgClient } from '../_shared/wpp.ts';
import { 
  corsHeaders, 
  successResponse, 
  errorResponse,
  getErrorMessage,
  handleCors,
} from '../_shared/types.ts';

const WPP_BASE_URL = Deno.env.get('WPP_BASE_URL') || 'https://msg.academyos.ru';

interface EditMessageRequest {
  messageId: string;
  newMessage: string;
  clientId?: string; // Optional, we use client_id from message record
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { messageId, newMessage }: EditMessageRequest = await req.json();

    console.log('[wpp-edit] Editing message:', { messageId, newMessage: newMessage?.substring(0, 50) });

    if (!newMessage?.trim()) {
      return errorResponse('New message text is required', 400);
    }

    // Get message info from database
    const { data: messageData, error: fetchError } = await supabase
      .from('chat_messages')
      .select('external_message_id, client_id, organization_id')
      .eq('id', messageId)
      .single();

    if (fetchError || !messageData) {
      console.error('[wpp-edit] Error fetching message:', fetchError);
      return errorResponse('Message not found', 404);
    }

    const oldTaskId = messageData.external_message_id;
    if (!oldTaskId) {
      return errorResponse('No external message ID (taskId) found - message cannot be edited in WhatsApp', 400);
    }

    // Get client phone for sending new message
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('phone')
      .eq('id', messageData.client_id)
      .single();

    if (clientError || !clientData) {
      console.error('[wpp-edit] Error fetching client:', clientError);
      return errorResponse('Client not found', 404);
    }

    if (!clientData.phone) {
      return errorResponse('No phone number available for client', 400);
    }

    // Get WPP integration for this organization
    const { data: integration } = await supabase
      .from('messenger_integrations')
      .select('id, settings')
      .eq('organization_id', messageData.organization_id)
      .eq('messenger_type', 'whatsapp')
      .eq('provider', 'wpp')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!integration) {
      return errorResponse('WPP integration not configured for this organization', 404);
    }

    const settings = (integration.settings || {}) as Record<string, any>;
    const wppApiKey = settings.wppApiKey;
    const wppAccountNumber = settings.wppAccountNumber;
    const wppJwtToken = settings.wppJwtToken;
    const wppJwtExpiresAt = settings.wppJwtExpiresAt;

    if (!wppApiKey || !wppAccountNumber) {
      return errorResponse('wppApiKey or wppAccountNumber not configured', 400);
    }

    // Check if cached JWT is valid
    const isTokenValid = wppJwtToken && wppJwtExpiresAt && Date.now() < wppJwtExpiresAt - 60_000;
    console.log('[wpp-edit] JWT token valid:', isTokenValid);

    // Create WPP client
    const wpp = new WppMsgClient({
      baseUrl: WPP_BASE_URL,
      apiKey: wppApiKey,
      jwtToken: isTokenValid ? wppJwtToken : undefined,
      jwtExpiresAt: isTokenValid ? wppJwtExpiresAt : undefined,
    });

    // Step 1: Delete old message via DELETE /api/messages/{oldTaskId}
    console.log('[wpp-edit] Step 1: Deleting old message, taskId:', oldTaskId);
    const deleteResult = await wpp.deleteMessage(oldTaskId);

    if (!deleteResult.success) {
      console.error('[wpp-edit] Failed to delete old message:', deleteResult.error);
      // Continue anyway - we'll send the new message even if delete failed
      console.log('[wpp-edit] Continuing with new message despite delete failure...');
    }

    // Step 2: Send new message via POST /api/messages/text
    const phone = normalizePhoneForWpp(clientData.phone);
    console.log('[wpp-edit] Step 2: Sending new message to:', phone);

    const sendResult = await wpp.sendText(wppAccountNumber, phone, newMessage.trim());

    if (!sendResult.success) {
      console.error('[wpp-edit] Failed to send new message:', sendResult.error);
      return errorResponse(`Failed to send edited message: ${sendResult.error}`, 500);
    }

    const newTaskId = sendResult.taskId;
    console.log('[wpp-edit] New message sent, taskId:', newTaskId);

    // Step 3: Update message in database with new text and new taskId
    const { error: updateError } = await supabase
      .from('chat_messages')
      .update({ 
        message_text: newMessage.trim(),
        external_message_id: newTaskId || null,
      })
      .eq('id', messageId);

    if (updateError) {
      console.error('[wpp-edit] Error updating message in database:', updateError);
    }

    // Save refreshed JWT token if changed
    try {
      const currentToken = await wpp.getToken();
      if (currentToken && currentToken !== wppJwtToken) {
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
          .eq('id', integration.id);
        console.log('[wpp-edit] JWT token refreshed and saved');
      }
    } catch (e) {
      console.warn('[wpp-edit] Failed to save refreshed token:', e);
    }

    console.log('[wpp-edit] ✓ Message edited successfully');
    return successResponse({ 
      success: true, 
      message: 'Message edited successfully',
      newTaskId,
    });

  } catch (error: unknown) {
    console.error('[wpp-edit] Unexpected error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});

/**
 * Нормализует телефон для WhatsApp API
 */
function normalizePhoneForWpp(phone: string): string {
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
