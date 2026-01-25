import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { WppClient } from '../_shared/wpp.ts';
import { 
  corsHeaders, 
  errorResponse,
  getErrorMessage,
  handleCors,
  type WppStatusRequest,
  type WppStatusResponse,
  type WppSessionResult,
} from '../_shared/types.ts';

const BASE = Deno.env.get('WPP_BASE_URL') || 'https://msg.academyos.ru';
const SECRET = Deno.env.get('WPP_SECRET') || '';

console.log('[wpp-status] Configuration:', {
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

    // Read request body to get force flag
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
    // Use org-specific session (without dashes for WPP compatibility)
    const sessionName = `org_${orgId.replace(/-/g, '')}`;

    console.log('[wpp-status] Org ID:', orgId);
    console.log('[wpp-status] Session:', sessionName);

    // Check cached QR from DB
    const { data: session } = await supabaseClient
      .from('whatsapp_sessions')
      .select('status, last_qr_b64, last_qr_at')
      .eq('organization_id', orgId)
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
          qrcode: session.last_qr_b64 
        };
        return new Response(
          JSON.stringify(cachedResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
        );
      }
    }

    // If already connected, return early
    if (session?.status === 'connected') {
      console.log('[wpp-status] Already connected');
      const connectedResponse: WppStatusResponse = { 
        success: true,
        status: 'connected' 
      };
      return new Response(
        JSON.stringify(connectedResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
      );
    }

    // Otherwise, check live status
    const wpp = new WppClient({
      baseUrl: BASE,
      session: sessionName,
      secret: SECRET,
      pollSeconds: 10, // Shorter polling for status check
    });

    const result = await wpp.ensureSessionWithQr() as WppSessionResult;

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
        }, { onConflict: 'organization_id' });

      const qrResponse: WppStatusResponse = { 
        success: true,
        status: 'qr_issued', 
        qrcode: result.base64,
        last_qr_at: new Date().toISOString()
      };
      return new Response(
        JSON.stringify(qrResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
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
        }, { onConflict: 'organization_id' });

      const connectedResponse: WppStatusResponse = { 
        success: true,
        status: 'connected' 
      };
      return new Response(
        JSON.stringify(connectedResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
      );
    }

    // timeout or error
    const pendingResponse: WppStatusResponse = { 
      success: true,
      status: 'qr_pending', 
      message: 'QR code not ready yet' 
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
