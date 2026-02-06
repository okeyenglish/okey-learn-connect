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

    const { messageId }: DeleteMessageRequest = await req.json();

    console.log('[wpp-delete] Deleting message:', messageId);

    // Get message info from database
    const { data: messageData, error: fetchError } = await supabase
      .from('chat_messages')
      .select('external_message_id, client_id, organization_id')
      .eq('id', messageId)
      .single();

    if (fetchError || !messageData) {
      console.error('[wpp-delete] Error fetching message:', fetchError);
      return errorResponse('Message not found', 404);
    }

    const taskId = messageData.external_message_id;
    if (!taskId) {
      return errorResponse('No external message ID (taskId) found - message cannot be deleted from WhatsApp', 400);
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

    // Delete message via new WPP API: DELETE /api/messages/{taskId}
    console.log('[wpp-delete] Calling DELETE /api/messages/' + taskId);
    const deleteResult = await wpp.deleteMessage(taskId);

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
    });

  } catch (error: unknown) {
    console.error('[wpp-delete] Unexpected error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});
