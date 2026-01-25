import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { WppClient } from '../_shared/wpp.ts';
import { 
  corsHeaders, 
  errorResponse,
  getErrorMessage,
  handleCors,
  type WppStartRequest,
  type WppStartResponse,
  type WppSessionResult,
} from '../_shared/types.ts';

const BASE = Deno.env.get('WPP_BASE_URL') || 'https://msg.academyos.ru';
const SECRET = Deno.env.get('WPP_SECRET') || '';

console.log('[wpp-start] Configuration:', {
  BASE,
  SECRET: SECRET ? `${SECRET.substring(0, 4)}***${SECRET.slice(-4)}` : 'MISSING'
});

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Read request body for custom session suffix
    const body = await req.json().catch(() => ({})) as WppStartRequest;
    const sessionSuffix = body?.session_suffix || '';

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
    // Use org-specific session (without dashes for WPP compatibility)
    // Add optional suffix for multiple sessions per organization
    const baseSessionName = `org_${orgId.replace(/-/g, '')}`;
    const sessionName = sessionSuffix ? `${baseSessionName}_${sessionSuffix}` : baseSessionName;
    const PUBLIC_URL = Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '');
    const webhookUrl = `${PUBLIC_URL}/functions/v1/wpp-webhook`;

    console.log('[wpp-start] Org ID:', orgId);
    console.log('[wpp-start] Session:', sessionName);
    console.log('[wpp-start] Session suffix:', sessionSuffix || 'none');
    console.log('[wpp-start] Webhook URL:', webhookUrl);

    // Use WppClient SDK
    const wpp = new WppClient({
      baseUrl: BASE,
      session: sessionName,
      secret: SECRET,
      pollSeconds: 30,
    });

    const result = await wpp.ensureSessionWithQr(webhookUrl) as WppSessionResult;

    if (result.state === 'qr') {
      await supabaseClient
        .from('whatsapp_sessions')
        .upsert({
          organization_id: orgId,
          session_name: sessionName,
          status: 'qr_issued',
          last_qr_b64: result.base64,
          last_qr_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'session_name' });

      const qrResponse: WppStartResponse = { 
        success: true,
        ok: true, 
        status: 'qr_issued', 
        qrcode: result.base64, 
        session_name: sessionName 
      };
      return new Response(
        JSON.stringify(qrResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (result.state === 'connected') {
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

      const connectedResponse: WppStartResponse = { 
        success: true,
        ok: true, 
        status: 'connected', 
        session_name: sessionName 
      };
      return new Response(
        JSON.stringify(connectedResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (result.state === 'timeout') {
      const timeoutResponse: WppStartResponse = { 
        success: false,
        ok: false, 
        status: 'timeout',
        error: 'Timeout waiting for QR code' 
      };
      return new Response(
        JSON.stringify(timeoutResponse),
        { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
