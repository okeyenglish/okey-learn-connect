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

interface DeleteMessageRequest {
  messageId: string;
}

/**
 * Normalize phone number for WPP API (expects +7XXXXXXXXXX format)
 */
function normalizePhoneForWpp(phone: string): string {
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');
  
  // Russian number normalization
  if (digits.length === 10 && digits.startsWith('9')) {
    digits = '7' + digits;
  } else if (digits.length === 11 && digits.startsWith('8')) {
    digits = '7' + digits.slice(1);
  }
  
  return '+' + digits;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { messageId }: DeleteMessageRequest = await req.json();

    console.log('[wpp-delete] Deleting message:', messageId);

    // Get message info from database including client_id and teacher_id
    const { data: messageData, error: fetchError } = await supabase
      .from('chat_messages')
      .select('external_message_id, client_id, teacher_id, organization_id')
      .eq('id', messageId)
      .single();

    if (fetchError || !messageData) {
      console.error('[wpp-delete] Error fetching message:', fetchError);
      return errorResponse('Message not found', 404);
    }

    const waMessageId = messageData.external_message_id;
    if (!waMessageId) {
      // No external ID - just mark as deleted locally
      console.log('[wpp-delete] No external message ID - marking as deleted locally only');
      
      const { error: updateError } = await supabase
        .from('chat_messages')
        .update({ 
          message_text: '[Сообщение удалено]',
          external_message_id: null,
        })
        .eq('id', messageId);

      if (updateError) {
        console.error('[wpp-delete] Error updating message in database:', updateError);
      }
      
      return successResponse({ 
        success: true, 
        message: 'Message deleted locally (no WPP message ID)',
        wppDeleted: false,
      });
    }

    // Get phone number from client or teacher
    let phoneNumber: string | null = null;
    
    if (messageData.client_id) {
      const { data: client } = await supabase
        .from('clients')
        .select('phone')
        .eq('id', messageData.client_id)
        .single();
      phoneNumber = client?.phone;
      console.log('[wpp-delete] Got phone from client:', phoneNumber);
    } else if (messageData.teacher_id) {
      const { data: teacher } = await supabase
        .from('teachers')
        .select('phone')
        .eq('id', messageData.teacher_id)
        .single();
      phoneNumber = teacher?.phone;
      console.log('[wpp-delete] Got phone from teacher:', phoneNumber);
    }

    if (!phoneNumber) {
      console.warn('[wpp-delete] No phone number found - deleting locally only');
      
      const { error: updateError } = await supabase
        .from('chat_messages')
        .update({ 
          message_text: '[Сообщение удалено]',
          external_message_id: null,
        })
        .eq('id', messageId);

      if (updateError) {
        console.error('[wpp-delete] Error updating message in database:', updateError);
      }
      
      return successResponse({ 
        success: true, 
        message: 'Message deleted locally (no phone number)',
        wppDeleted: false,
      });
    }

    // Normalize phone for WPP API
    const to = normalizePhoneForWpp(phoneNumber);
    console.log('[wpp-delete] Normalized phone:', to);

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
    const wppJwtToken = settings.wppJwtToken;
    const wppJwtExpiresAt = settings.wppJwtExpiresAt;

    if (!wppApiKey) {
      return errorResponse('wppApiKey not configured', 400);
    }

    // Check if cached JWT is valid
    const isTokenValid = wppJwtToken && wppJwtExpiresAt && Date.now() < wppJwtExpiresAt - 60_000;
    console.log('[wpp-delete] JWT token valid:', isTokenValid);

    // Create WPP client
    const wpp = new WppMsgClient({
      baseUrl: WPP_BASE_URL,
      apiKey: wppApiKey,
      jwtToken: isTokenValid ? wppJwtToken : undefined,
      jwtExpiresAt: isTokenValid ? wppJwtExpiresAt : undefined,
    });

    // Delete message via WPP API with waMessageId and phone
    console.log('[wpp-delete] Calling DELETE /api/messages/' + waMessageId + ' with to:', to);
    const deleteResult = await wpp.deleteMessageByWaId(waMessageId, to);

    // Handle WPP API response
    // "not found" means message already deleted or doesn't exist on WPP - we still mark as deleted locally
    const isNotFoundError = deleteResult.error?.includes('not found') || 
                            deleteResult.error?.includes('404') ||
                            deleteResult.error?.includes('HTTP 400');
    
    if (!deleteResult.success && !isNotFoundError) {
      // Real error (auth, network, etc.) - fail the request
      console.error('[wpp-delete] WPP API error:', deleteResult.error);
      return errorResponse(`Failed to delete message from WhatsApp: ${deleteResult.error}`, 500);
    }

    if (isNotFoundError) {
      console.log('[wpp-delete] Message not found on WPP (already deleted or different provider) - marking as deleted locally');
    }

    // Mark message as deleted in database
    const { error: updateError } = await supabase
      .from('chat_messages')
      .update({ 
        message_text: '[Сообщение удалено]',
        external_message_id: null,
      })
      .eq('id', messageId);

    if (updateError) {
      console.error('[wpp-delete] Error updating message in database:', updateError);
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
        console.log('[wpp-delete] JWT token refreshed and saved');
      }
    } catch (e) {
      console.warn('[wpp-delete] Failed to save refreshed token:', e);
    }

    console.log('[wpp-delete] ✓ Message deleted successfully');
    return successResponse({ 
      success: true, 
      message: 'Message deleted successfully',
      wppDeleted: !isNotFoundError,
    });

  } catch (error: unknown) {
    console.error('[wpp-delete] Unexpected error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});
