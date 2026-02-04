import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { WppMsgClient } from '../_shared/wpp.ts';
import { 
  corsHeaders, 
  errorResponse,
  getErrorMessage,
  handleCors,
} from '../_shared/types.ts';

const WPP_BASE_URL = Deno.env.get('WPP_BASE_URL') || 'https://msg.academyos.ru';
const WPP_SECRET = Deno.env.get('WPP_SECRET');

console.log('[wpp-create] Configuration:', { WPP_BASE_URL, hasSecret: !!WPP_SECRET });

interface WppCreateResponse {
  success: boolean;
  session?: string;
  apiKey?: string;
  status: 'connected' | 'starting' | 'qr_issued' | 'error';
  qrcode?: string;
  error?: string;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Check WPP_SECRET
    if (!WPP_SECRET) {
      console.error('[wpp-create] WPP_SECRET not configured');
      return errorResponse('WPP_SECRET not configured', 500);
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Missing authorization', 401);
    }

    const userJwt = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(userJwt);
    
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
    console.log('[wpp-create] Org ID:', orgId);

    // Check for existing WPP integration with credentials
    const { data: existingIntegration } = await supabaseClient
      .from('messenger_integrations')
      .select('id, settings')
      .eq('organization_id', orgId)
      .eq('messenger_type', 'whatsapp')
      .eq('provider', 'wpp')
      .eq('is_active', true)
      .maybeSingle();

    const settings = (existingIntegration?.settings || {}) as Record<string, any>;

    // If integration exists with credentials, check status and return
    if (existingIntegration && settings.wppApiKey && settings.wppAccountNumber) {
      console.log('[wpp-create] Found existing integration:', existingIntegration.id);
      
      // Проверяем валидность сохранённого JWT (с запасом 60 сек)
      const isTokenValid = settings.wppJwtToken && settings.wppJwtExpiresAt && Date.now() < settings.wppJwtExpiresAt - 60_000;
      
      const wpp = new WppMsgClient({
        baseUrl: WPP_BASE_URL,
        apiKey: settings.wppApiKey,
        jwtToken: isTokenValid ? settings.wppJwtToken : undefined,
        jwtExpiresAt: isTokenValid ? settings.wppJwtExpiresAt : undefined,
      });

      // Check current status
      const accountStatus = await wpp.getAccountStatus(settings.wppAccountNumber);
      console.log('[wpp-create] Existing account status:', accountStatus.status);

      // Helper function to save JWT and return response
      const saveTokenAndReturn = async (response: WppCreateResponse) => {
        const currentToken = await wpp.getToken();
        if (currentToken && currentToken !== settings.wppJwtToken) {
          console.log('[wpp-create] Saving JWT token for existing integration');
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
            .eq('id', existingIntegration.id);
        }
        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      };

      if (accountStatus.status === 'connected') {
        return saveTokenAndReturn({
          success: true,
          session: settings.wppAccountNumber,
          apiKey: maskApiKey(settings.wppApiKey),
          status: 'connected',
        });
      }

      // Try to start account and get QR
      const startResult = await wpp.startAccount(settings.wppAccountNumber);
      console.log('[wpp-create] Start result:', startResult.state);

      if (startResult.state === 'qr') {
        return saveTokenAndReturn({
          success: true,
          session: settings.wppAccountNumber,
          apiKey: maskApiKey(settings.wppApiKey),
          status: 'qr_issued',
          qrcode: startResult.qr,
        });
      }

      if (startResult.state === 'connected') {
        return saveTokenAndReturn({
          success: true,
          session: settings.wppAccountNumber,
          apiKey: maskApiKey(settings.wppApiKey),
          status: 'connected',
        });
      }

      // Return starting status
      return saveTokenAndReturn({
        success: true,
        session: settings.wppAccountNumber,
        apiKey: maskApiKey(settings.wppApiKey),
        status: 'starting',
      });
    }

    // =========================================================================
    // Create new client on WPP Platform using WPP_SECRET (server-to-server)
    // =========================================================================
    console.log('[wpp-create] Creating new client on WPP Platform with WPP_SECRET');
    
    const newClient = await WppMsgClient.createClient(WPP_BASE_URL, WPP_SECRET, orgId);
    console.log('[wpp-create] New client created:', newClient.session, 'status:', newClient.status);

    // Сразу получаем JWT токен и сохраняем его
    console.log('[wpp-create] Getting initial JWT token...');
    const { token: jwtToken, expiresAt: jwtExpiresAt } = await WppMsgClient.getInitialToken(WPP_BASE_URL, newClient.apiKey);
    console.log('[wpp-create] JWT token obtained, expires:', new Date(jwtExpiresAt).toISOString());

    const newSettings = {
      wppApiKey: newClient.apiKey,
      wppAccountNumber: newClient.session,
      wppJwtToken: jwtToken,         // ← Сохраняем JWT
      wppJwtExpiresAt: jwtExpiresAt, // ← Сохраняем время истечения
    };

    // Save or update integration
    if (existingIntegration) {
      await supabaseClient
        .from('messenger_integrations')
        .update({
          settings: { ...settings, ...newSettings },
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingIntegration.id);
    } else {
      await supabaseClient
        .from('messenger_integrations')
        .insert({
          organization_id: orgId,
          messenger_type: 'whatsapp',
          provider: 'wpp',
          name: 'WhatsApp (WPP)',
          is_active: true,
          is_primary: true,
          settings: newSettings,
        });
    }

    // Now use the new API key to get JWT and start account
    const wpp = new WppMsgClient({
      baseUrl: WPP_BASE_URL,
      apiKey: newClient.apiKey,
    });

    const startResult = await wpp.startAccount(newClient.session);
    console.log('[wpp-create] New account start result:', startResult.state);

    if (startResult.state === 'qr') {
      const response: WppCreateResponse = {
        success: true,
        session: newClient.session,
        apiKey: maskApiKey(newClient.apiKey),
        status: 'qr_issued',
        qrcode: startResult.qr,
      };
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (startResult.state === 'connected') {
      const response: WppCreateResponse = {
        success: true,
        session: newClient.session,
        apiKey: maskApiKey(newClient.apiKey),
        status: 'connected',
      };
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Return starting status
    const response: WppCreateResponse = {
      success: true,
      session: newClient.session,
      apiKey: maskApiKey(newClient.apiKey),
      status: 'starting',
    };
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('[wpp-create] Error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});

function maskApiKey(key: string): string {
  if (key.length < 12) return '***';
  return `${key.substring(0, 6)}••••••${key.slice(-4)}`;
}
