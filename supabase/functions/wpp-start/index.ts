import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { WppMsgClient } from '../_shared/wpp.ts';
import { 
  corsHeaders, 
  errorResponse,
  getErrorMessage,
  handleCors,
} from '../_shared/types.ts';

const WPP_BASE_URL = Deno.env.get('WPP_BASE_URL') || 'https://msg.academyos.ru';

console.log('[wpp-start] Configuration:', { WPP_BASE_URL });

interface WppStartRequest {
  integration_id?: string;
}

interface WppStartResponse {
  success: boolean;
  ok: boolean;
  status: 'connected' | 'qr_issued' | 'timeout' | 'error' | 'starting';
  qrcode?: string;
  account_number?: string;
  error?: string;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json().catch(() => ({})) as WppStartRequest;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Missing authorization', 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return errorResponse('Organization not found', 404);
    }

    const orgId = profile.organization_id;
    console.log('[wpp-start] Org ID:', orgId);

    // Find WPP integration for this organization
    let integrationQuery = supabaseClient
      .from('messenger_integrations')
      .select('id, settings, is_primary')
      .eq('organization_id', orgId)
      .eq('messenger_type', 'whatsapp')
      .eq('provider', 'wpp')
      .eq('is_active', true);

    if (body.integration_id) {
      integrationQuery = integrationQuery.eq('id', body.integration_id);
    } else {
      integrationQuery = integrationQuery.eq('is_primary', true);
    }

    const { data: integration, error: integrationError } = await integrationQuery.maybeSingle();

    if (integrationError || !integration) {
      // Fallback: find any active WPP integration
      const { data: anyIntegration } = await supabaseClient
        .from('messenger_integrations')
        .select('id, settings, is_primary')
        .eq('organization_id', orgId)
        .eq('messenger_type', 'whatsapp')
        .eq('provider', 'wpp')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (!anyIntegration) {
        return errorResponse('WPP integration not configured. Please add wppApiKey and wppAccountNumber in settings.', 404);
      }
    }

    const settings = (integration?.settings || {}) as Record<string, any>;
    const wppApiKey = settings.wppApiKey;
    const wppAccountNumber = settings.wppAccountNumber;

    if (!wppApiKey) {
      return errorResponse('wppApiKey not configured in integration settings', 400);
    }

    if (!wppAccountNumber) {
      return errorResponse('wppAccountNumber not configured in integration settings', 400);
    }

    console.log('[wpp-start] Account number:', wppAccountNumber);

    // Build webhook URL
    const PUBLIC_URL = Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '');
    const webhookUrl = `${PUBLIC_URL}/functions/v1/wpp-webhook?account=${wppAccountNumber}`;
    console.log('[wpp-start] Webhook URL:', webhookUrl);

    // Create WppMsgClient with organization's API key
    const wpp = new WppMsgClient({
      baseUrl: WPP_BASE_URL,
      apiKey: wppApiKey,
    });

    // Start account and get QR if needed
    const result = await wpp.ensureAccountWithQr(wppAccountNumber, webhookUrl, 30);

    if (result.state === 'qr') {
      // Save QR to whatsapp_sessions
      await supabaseClient
        .from('whatsapp_sessions')
        .upsert({
          organization_id: orgId,
          session_name: `wpp_${wppAccountNumber}`,
          status: 'qr_issued',
          last_qr_b64: result.qr,
          last_qr_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'session_name' });

      const response: WppStartResponse = { 
        success: true,
        ok: true, 
        status: 'qr_issued', 
        qrcode: result.qr, 
        account_number: wppAccountNumber 
      };
      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (result.state === 'connected') {
      await supabaseClient
        .from('whatsapp_sessions')
        .upsert({
          organization_id: orgId,
          session_name: `wpp_${wppAccountNumber}`,
          status: 'connected',
          last_qr_b64: null,
          last_qr_at: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'session_name' });

      const response: WppStartResponse = { 
        success: true,
        ok: true, 
        status: 'connected', 
        account_number: wppAccountNumber 
      };
      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (result.state === 'timeout') {
      const response: WppStartResponse = { 
        success: false,
        ok: false, 
        status: 'timeout',
        error: 'Timeout waiting for QR code' 
      };
      return new Response(
        JSON.stringify(response),
        { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (result.state === 'starting') {
      const response: WppStartResponse = { 
        success: true,
        ok: true, 
        status: 'starting',
        account_number: wppAccountNumber 
      };
      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // error state
    const errorResponseData: WppStartResponse = { 
      success: false,
      ok: false, 
      status: 'error',
      error: result.state === 'error' ? result.message : 'Unknown error' 
    };
    return new Response(
      JSON.stringify(errorResponseData),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[wpp-start] Error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});
