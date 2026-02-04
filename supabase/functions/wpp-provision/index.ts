/**
 * WPP Provision - Auto-provisioning for WhatsApp WPP integration
 * 
 * Architecture (server-to-server with WPP_SECRET):
 * 1. User clicks "Connect WhatsApp"
 * 2. Edge Function validates user via Supabase JWT
 * 3. Edge Function calls WPP Platform with WPP_SECRET + organizationId
 * 4. WPP Platform creates client, returns { apiKey, session, status }
 * 5. We save apiKey, then use it to get JWT from /auth/token
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { WppMsgClient } from '../_shared/wpp.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProvisionResponse {
  success: boolean;
  status: 'qr_issued' | 'connected' | 'starting' | 'error';
  qrcode?: string;
  integration_id?: string;
  account_number?: string;
  session?: string;
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[wpp-provision] Starting provision request');

    // Get environment variables
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const WPP_BASE_URL = Deno.env.get('WPP_BASE_URL') || 'https://msg.academyos.ru';
    const WPP_SECRET = Deno.env.get('WPP_SECRET');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    if (!WPP_SECRET) {
      throw new Error('WPP_SECRET not configured');
    }

    // Get user JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Требуется авторизация' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userJwt = authHeader.replace(/^Bearer\s+/i, '');

    // Create Supabase client with service role for DB operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(userJwt);
    if (authError || !user) {
      console.error('[wpp-provision] Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Неверный токен авторизации' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[wpp-provision] User: ${user.id}`);

    // Get user's organization_id from profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      console.error('[wpp-provision] Profile error:', profileError);
      return new Response(
        JSON.stringify({ success: false, error: 'Не найдена организация пользователя' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orgId = profile.organization_id;
    console.log(`[wpp-provision] Organization: ${orgId}`);

    // Check if WPP integration already exists for this org
    const { data: existingIntegration, error: checkError } = await supabase
      .from('messenger_integrations')
      .select('*')
      .eq('organization_id', orgId)
      .eq('provider', 'wpp')
      .maybeSingle();

    if (checkError) {
      console.error('[wpp-provision] Check error:', checkError);
      throw new Error('Ошибка проверки существующей интеграции');
    }

    let integrationId: string;
    let orgApiKey: string;
    let sessionName: string;

    if (existingIntegration?.settings?.wppApiKey) {
      // Use existing integration with API key
      integrationId = existingIntegration.id;
      orgApiKey = existingIntegration.settings.wppApiKey;
      sessionName = existingIntegration.settings.wppAccountNumber;
      console.log(`[wpp-provision] Using existing integration: ${integrationId}`);
    } else {
      // =========================================================================
      // Create new client on WPP Platform using WPP_SECRET (server-to-server)
      // =========================================================================
      console.log(`[wpp-provision] Creating new client on WPP Platform with WPP_SECRET`);
      
      const newClient = await WppMsgClient.createClient(WPP_BASE_URL, WPP_SECRET, orgId);
      orgApiKey = newClient.apiKey;
      sessionName = newClient.session;
      
      console.log(`[wpp-provision] ✓ Client created, session: ${sessionName}`);

      if (existingIntegration) {
        // Update existing integration with new API key
        integrationId = existingIntegration.id;
        await supabase
          .from('messenger_integrations')
          .update({
            settings: {
              ...existingIntegration.settings,
              wppApiKey: orgApiKey,
              wppAccountNumber: sessionName,
            },
          })
          .eq('id', integrationId);
      } else {
        // Create new integration
        const { data: newIntegration, error: insertError } = await supabase
          .from('messenger_integrations')
          .insert({
            organization_id: orgId,
            messenger_type: 'whatsapp',
            provider: 'wpp',
            name: 'WhatsApp (WPP)',
            is_primary: true,
            is_active: true,
            settings: {
              wppApiKey: orgApiKey,
              wppAccountNumber: sessionName,
            },
          })
          .select()
          .single();

        if (insertError || !newIntegration) {
          console.error('[wpp-provision] Insert error:', insertError);
          throw new Error('Не удалось создать интеграцию');
        }

        integrationId = newIntegration.id;
        console.log(`[wpp-provision] Created new integration: ${integrationId}`);
      }
    }

    // Initialize WPP client with organization's API key
    // This will get JWT via POST /auth/token { apiKey }
    const wpp = new WppMsgClient({
      baseUrl: WPP_BASE_URL,
      apiKey: orgApiKey,
    });

    // Build webhook URL
    const webhookUrl = `${SUPABASE_URL}/functions/v1/wpp-webhook?account=${sessionName}`;
    console.log(`[wpp-provision] Webhook URL: ${webhookUrl}`);

    // Start account and get QR if needed
    const result = await wpp.ensureAccountWithQr(sessionName, webhookUrl, 30);
    console.log(`[wpp-provision] WPP result state: ${result.state}`);

    // Build response
    const response: ProvisionResponse = {
      success: true,
      status: result.state === 'qr' ? 'qr_issued' : 
              result.state === 'connected' ? 'connected' : 
              result.state === 'error' ? 'error' : 'starting',
      integration_id: integrationId,
      account_number: sessionName,
      session: sessionName,
    };

    if (result.state === 'qr') {
      response.qrcode = result.qr;
    }

    if (result.state === 'error') {
      response.error = result.message;
    }

    console.log(`[wpp-provision] Response status: ${response.status}`);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[wpp-provision] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        status: 'error',
        error: error.message || 'Внутренняя ошибка сервера',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
