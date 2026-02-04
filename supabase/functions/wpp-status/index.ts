import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { WppMsgClient } from '../_shared/wpp.ts';
import { 
  corsHeaders, 
  errorResponse,
  getErrorMessage,
  handleCors,
} from '../_shared/types.ts';

const WPP_BASE_URL = Deno.env.get('WPP_BASE_URL') || 'https://msg.academyos.ru';

console.log('[wpp-status] Configuration:', { WPP_BASE_URL });

interface WppStatusRequest {
  force?: boolean;
  integration_id?: string;
}

interface WppStatusResponse {
  success: boolean;
  status: 'connected' | 'qr_issued' | 'qr_pending' | 'disconnected' | 'error';
  qrcode?: string;
  last_qr_at?: string;
  account_number?: string;
  message?: string;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json().catch(() => ({})) as WppStatusRequest;
    const force = body?.force === true;
    console.log('[wpp-status] Force refresh:', force);

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
    console.log('[wpp-status] Org ID:', orgId);

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

    const { data: integration } = await integrationQuery.maybeSingle();

    if (!integration) {
      // Fallback: find any active WPP integration
      const { data: anyIntegration } = await supabaseClient
        .from('messenger_integrations')
        .select('id, settings')
        .eq('organization_id', orgId)
        .eq('messenger_type', 'whatsapp')
        .eq('provider', 'wpp')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (!anyIntegration) {
        const response: WppStatusResponse = {
          success: true,
          status: 'disconnected',
          message: 'WPP integration not configured'
        };
        return new Response(
          JSON.stringify(response),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const settings = (integration?.settings || {}) as Record<string, any>;
    const wppApiKey = settings.wppApiKey;
    const wppAccountNumber = settings.wppAccountNumber;
    let wppJwtToken = settings.wppJwtToken;
    let wppJwtExpiresAt = settings.wppJwtExpiresAt;

    if (!wppApiKey || !wppAccountNumber) {
      const response: WppStatusResponse = {
        success: true,
        status: 'disconnected',
        message: 'wppApiKey or wppAccountNumber not configured'
      };
      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sessionName = `wpp_${wppAccountNumber}`;
    console.log('[wpp-status] Account number:', wppAccountNumber);

    // Check cached QR from DB
    const { data: session } = await supabaseClient
      .from('whatsapp_sessions')
      .select('status, last_qr_b64, last_qr_at')
      .eq('session_name', sessionName)
      .maybeSingle();

    // If we have a recent QR (< 25s) and status is qr_issued, return it to avoid hammering WPP
    // Skip cache if force flag is set
    if (!force && session?.status === 'qr_issued' && session.last_qr_b64 && session.last_qr_at) {
      const qrAge = Date.now() - new Date(session.last_qr_at).getTime();
      if (qrAge < 25 * 1000) {
        console.log('[wpp-status] Returning cached QR (age', Math.round(qrAge/1000), 's)');
        const cachedResponse: WppStatusResponse = { 
          success: true,
          status: 'qr_issued', 
          qrcode: session.last_qr_b64,
          account_number: wppAccountNumber
        };
        return new Response(
          JSON.stringify(cachedResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
        );
      }
    }

    // If already connected, return early (unless force)
    if (!force && session?.status === 'connected') {
      console.log('[wpp-status] Already connected');
      const connectedResponse: WppStatusResponse = { 
        success: true,
        status: 'connected',
        account_number: wppAccountNumber
      };
      return new Response(
        JSON.stringify(connectedResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
      );
    }

    // Проверяем валидность сохранённого JWT (с запасом 60 сек)
    const isTokenValid = wppJwtToken && wppJwtExpiresAt && Date.now() < wppJwtExpiresAt - 60_000;
    console.log('[wpp-status] JWT token valid:', isTokenValid, 'expires:', wppJwtExpiresAt ? new Date(wppJwtExpiresAt).toISOString() : 'N/A');

    // Otherwise, check live status via API
    const wpp = new WppMsgClient({
      baseUrl: WPP_BASE_URL,
      apiKey: wppApiKey,
      jwtToken: isTokenValid ? wppJwtToken : undefined,
      jwtExpiresAt: isTokenValid ? wppJwtExpiresAt : undefined,
    });

    const accountStatus = await wpp.getAccountStatus(wppAccountNumber);
    console.log('[wpp-status] Account status:', accountStatus);

    // Если токен обновился - сохраняем в базу
    const currentToken = await wpp.getToken().catch(() => null);
    if (currentToken && currentToken !== wppJwtToken && integration) {
      console.log('[wpp-status] Saving refreshed JWT token to DB');
      await supabaseClient
        .from('messenger_integrations')
        .update({
          settings: { 
            ...settings, 
            wppJwtToken: currentToken, 
            wppJwtExpiresAt: wpp.tokenExpiry 
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', integration.id);
    }

    if (accountStatus.status === 'connected') {
      await supabaseClient
        .from('whatsapp_sessions')
        .upsert({
          organization_id: orgId,
          session_name: sessionName,
          status: 'connected',
          last_qr_b64: null,
          last_qr_at: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'session_name' });

      const response: WppStatusResponse = { 
        success: true,
        status: 'connected',
        account_number: wppAccountNumber
      };
      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
      );
    }

    // Try to get QR if not connected
    if (accountStatus.status === 'qr_required' || accountStatus.status === 'starting') {
      const qr = await wpp.getAccountQr(wppAccountNumber);
      
      if (qr) {
        await supabaseClient
          .from('whatsapp_sessions')
          .upsert({
            organization_id: orgId,
            session_name: sessionName,
            status: 'qr_issued',
            last_qr_b64: qr,
            last_qr_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'session_name' });

        const response: WppStatusResponse = { 
          success: true,
          status: 'qr_issued', 
          qrcode: qr,
          last_qr_at: new Date().toISOString(),
          account_number: wppAccountNumber
        };
        return new Response(
          JSON.stringify(response),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
        );
      }
    }

    // Status is offline or no QR available
    const pendingResponse: WppStatusResponse = { 
      success: true,
      status: accountStatus.status === 'offline' ? 'disconnected' : 'qr_pending', 
      message: accountStatus.status === 'offline' ? 'Account is offline' : 'QR code not ready yet',
      account_number: wppAccountNumber
    };
    return new Response(
      JSON.stringify(pendingResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
    );

  } catch (error: unknown) {
    console.error('[wpp-status] Error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});
