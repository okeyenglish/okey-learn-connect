import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { WppMsgClient } from '../_shared/wpp.ts';
import { 
  corsHeaders, 
  errorResponse,
  getErrorMessage,
  handleCors,
} from '../_shared/types.ts';

const WPP_BASE_URL = Deno.env.get('WPP_BASE_URL') || 'https://msg.academyos.ru';

console.log('[wpp-qr] Configuration:', { WPP_BASE_URL });

interface WppQrRequest {
  session: string;
}

interface WppQrResponse {
  success: boolean;
  qr?: string | null;
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

    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Missing authorization', 401);
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    // Get organization_id
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return errorResponse('Organization not found', 404);
    }

    const orgId = profile.organization_id;

    // Get session from body or query
    let session: string | undefined;
    
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({})) as WppQrRequest;
      session = body.session;
    } else {
      const url = new URL(req.url);
      session = url.searchParams.get('session') || undefined;
    }

    if (!session) {
      return errorResponse('Session parameter required', 400);
    }

    console.log('[wpp-qr] Getting QR for session:', session, 'org:', orgId);

    // Find integration with matching session
    const { data: integration } = await supabaseClient
      .from('messenger_integrations')
      .select('id, settings')
      .eq('organization_id', orgId)
      .eq('messenger_type', 'whatsapp')
      .eq('provider', 'wpp')
      .eq('is_active', true)
      .maybeSingle();

    if (!integration) {
      return errorResponse('WPP integration not found', 404);
    }

    console.log('[wpp-qr] Integration found:', integration.id, 'settings keys:', Object.keys(integration.settings || {}));

    const settings = (integration.settings || {}) as Record<string, any>;
    const wppApiKey = settings.wppApiKey;
    const wppAccountNumber = settings.wppAccountNumber;
    let wppJwtToken = settings.wppJwtToken;
    let wppJwtExpiresAt = settings.wppJwtExpiresAt;

    // Verify session matches
    if (wppAccountNumber !== session) {
      console.warn('[wpp-qr] Session mismatch:', { requested: session, actual: wppAccountNumber });
      return errorResponse('Session not found for this organization', 404);
    }

    if (!wppApiKey) {
      return errorResponse('WPP API key not configured', 400);
    }

    // Проверяем валидность сохранённого JWT (с запасом 60 сек)
    const isTokenValid = wppJwtToken && wppJwtExpiresAt && Date.now() < wppJwtExpiresAt - 60_000;
    console.log('[wpp-qr] JWT token valid:', isTokenValid, 'expires:', wppJwtExpiresAt ? new Date(wppJwtExpiresAt).toISOString() : 'N/A');

    // Создаём клиента с JWT если валиден, иначе с apiKey для обновления
    const wpp = new WppMsgClient({
      baseUrl: WPP_BASE_URL,
      apiKey: wppApiKey,
      jwtToken: isTokenValid ? wppJwtToken : undefined,
      jwtExpiresAt: isTokenValid ? wppJwtExpiresAt : undefined,
    });

    const qr = await wpp.getAccountQr(wppAccountNumber);
    console.log('[wpp-qr] QR result:', qr ? `received (${qr.length} chars)` : 'null');

    // Если токен обновился - сохраняем в базу
    const currentToken = await wpp.getToken();
    if (currentToken && currentToken !== wppJwtToken) {
      console.log('[wpp-qr] Saving refreshed JWT token to DB');
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

    const response: WppQrResponse = {
      success: true,
      qr: qr,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });

  } catch (error: unknown) {
    console.error('[wpp-qr] Error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});
