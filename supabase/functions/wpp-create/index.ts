import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { WppMsgClient } from '../_shared/wpp.ts';
import { 
  corsHeaders, 
  errorResponse,
  getErrorMessage,
  handleCors,
} from '../_shared/types.ts';

const WPP_BASE_URL = Deno.env.get('WPP_BASE_URL') || 'https://msg.academyos.ru';
const WPP_API_KEY = Deno.env.get('WPP_API_KEY');

console.log('[wpp-create] Configuration:', { WPP_BASE_URL, hasApiKey: !!WPP_API_KEY });

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
    // Check master API key
    if (!WPP_API_KEY) {
      console.error('[wpp-create] WPP_API_KEY not configured');
      return errorResponse('WPP_API_KEY not configured', 500);
    }

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
    const clientId = orgId.substring(0, 8);
    console.log('[wpp-create] Org ID:', orgId, 'Client ID:', clientId);

    // Check for existing WPP integration
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
      
      const wpp = new WppMsgClient({
        baseUrl: WPP_BASE_URL,
        apiKey: settings.wppApiKey,
      });

      // Check current status
      const accountStatus = await wpp.getAccountStatus(settings.wppAccountNumber);
      console.log('[wpp-create] Existing account status:', accountStatus.status);

      if (accountStatus.status === 'connected') {
        const response: WppCreateResponse = {
          success: true,
          session: settings.wppAccountNumber,
          apiKey: maskApiKey(settings.wppApiKey),
          status: 'connected',
        };
        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Try to start account and get QR
      const startResult = await wpp.startAccount(settings.wppAccountNumber);
      console.log('[wpp-create] Start result:', startResult.state);

      if (startResult.state === 'qr') {
        const response: WppCreateResponse = {
          success: true,
          session: settings.wppAccountNumber,
          apiKey: maskApiKey(settings.wppApiKey),
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
          session: settings.wppAccountNumber,
          apiKey: maskApiKey(settings.wppApiKey),
          status: 'connected',
        };
        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Return starting status
      const response: WppCreateResponse = {
        success: true,
        session: settings.wppAccountNumber,
        apiKey: maskApiKey(settings.wppApiKey),
        status: 'starting',
      };
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create new API key via WPP platform
    console.log('[wpp-create] Creating new API key for client:', clientId);
    const newCredentials = await WppMsgClient.createApiKey(WPP_BASE_URL, WPP_API_KEY, clientId);
    console.log('[wpp-create] New credentials created:', newCredentials.session);

    const accountNumber = newCredentials.session || `org_${clientId}`;
    const newSettings = {
      wppApiKey: newCredentials.apiKey,
      wppAccountNumber: accountNumber,
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

    // Start the account to get QR
    const wpp = new WppMsgClient({
      baseUrl: WPP_BASE_URL,
      apiKey: newCredentials.apiKey,
    });

    const startResult = await wpp.startAccount(accountNumber);
    console.log('[wpp-create] New account start result:', startResult.state);

    if (startResult.state === 'qr') {
      const response: WppCreateResponse = {
        success: true,
        session: accountNumber,
        apiKey: maskApiKey(newCredentials.apiKey),
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
        session: accountNumber,
        apiKey: maskApiKey(newCredentials.apiKey),
        status: 'connected',
      };
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Return starting status
    const response: WppCreateResponse = {
      success: true,
      session: accountNumber,
      apiKey: maskApiKey(newCredentials.apiKey),
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
