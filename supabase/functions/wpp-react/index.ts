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

// Supported emojis for WPP reactions
const SUPPORTED_EMOJIS = ['🔥', '😂', '👍', '❤️', '😡'];

interface ReactMessageRequest {
  messageId: string;
  emoji: string;
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

    const { messageId, emoji }: ReactMessageRequest = await req.json();

    console.log('[wpp-react] Reacting to message:', messageId, 'with emoji:', emoji);

    // Validate emoji
    if (!SUPPORTED_EMOJIS.includes(emoji)) {
      return errorResponse(`Unsupported emoji. Supported: ${SUPPORTED_EMOJIS.join(' ')}`, 400);
    }

    // Get message info from database including client_id and teacher_id
    const { data: messageData, error: fetchError } = await supabase
      .from('chat_messages')
      .select('external_message_id, client_id, teacher_id, organization_id, is_outgoing')
      .eq('id', messageId)
      .single();

    if (fetchError || !messageData) {
      console.error('[wpp-react] Error fetching message:', fetchError);
      return errorResponse('Message not found', 404);
    }

    const waMessageId = messageData.external_message_id;
    if (!waMessageId) {
      // If no external_message_id, just save the reaction locally (message sent via other provider)
      console.log('[wpp-react] No external message ID - saving reaction locally only');
      return successResponse({ 
        success: true, 
        message: 'Reaction saved locally (no WPP message ID)',
        wppSent: false,
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
      console.log('[wpp-react] Got phone from client:', phoneNumber);
    } else if (messageData.teacher_id) {
      const { data: teacher } = await supabase
        .from('teachers')
        .select('phone')
        .eq('id', messageData.teacher_id)
        .single();
      phoneNumber = teacher?.phone;
      console.log('[wpp-react] Got phone from teacher:', phoneNumber);
    }

    if (!phoneNumber) {
      console.warn('[wpp-react] No phone number found for message recipient');
      return errorResponse('Phone number not found for message recipient', 400);
    }

    // Normalize phone for WPP API
    const to = normalizePhoneForWpp(phoneNumber);
    console.log('[wpp-react] Normalized phone:', to);

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
    console.log('[wpp-react] JWT token valid:', isTokenValid);

    // Create WPP client
    const wpp = new WppMsgClient({
      baseUrl: WPP_BASE_URL,
      apiKey: wppApiKey,
      jwtToken: isTokenValid ? wppJwtToken : undefined,
      jwtExpiresAt: isTokenValid ? wppJwtExpiresAt : undefined,
    });

    // Send reaction via WPP API with correct format: { to, waMessageId, emoji }
    console.log('[wpp-react] Calling POST /api/messages/react with:', { to, waMessageId, emoji });
    const reactResult = await wpp.reactToMessage(waMessageId, emoji, to);

    if (!reactResult.success) {
      console.error('[wpp-react] WPP API error:', reactResult.error);
      // Don't fail completely - reaction is already saved in DB
      return successResponse({ 
        success: true, 
        message: 'Reaction saved locally, but failed to send to WhatsApp: ' + reactResult.error,
        wppSent: false,
        wppError: reactResult.error,
      });
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
        console.log('[wpp-react] JWT token refreshed and saved');
      }
    } catch (e) {
      console.warn('[wpp-react] Failed to save refreshed token:', e);
    }

    console.log('[wpp-react] ✓ Reaction sent successfully');
    return successResponse({ 
      success: true, 
      message: 'Reaction sent to WhatsApp successfully',
      wppSent: true,
    });

  } catch (error: unknown) {
    console.error('[wpp-react] Unexpected error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});
