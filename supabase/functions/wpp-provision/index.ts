/**
 * WPP Provision - Auto-provisioning for WhatsApp WPP integration
 * 
 * Simplified flow:
 * 1. User clicks "Connect WhatsApp"
 * 2. This function creates integration + starts account + returns QR
 * 3. User scans QR → connected
 * 
 * Uses global WPP_API_KEY from secrets (same for all organizations)
 * Account number is auto-generated based on organization_id
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
    const WPP_API_KEY = Deno.env.get('WPP_API_KEY');
    const WPP_BASE_URL = Deno.env.get('WPP_BASE_URL') || 'https://msg.academyos.ru';

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    if (!WPP_API_KEY) {
      throw new Error('WPP_API_KEY not configured');
    }

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Требуется авторизация' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user token for auth check
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error('[wpp-provision] Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Неверный токен авторизации' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[wpp-provision] User: ${user.id}`);

    // Create service role client for DB operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

    // Generate account number from org ID (e.g., "org_abc12345")
    const accountNumber = `org_${orgId.substring(0, 8).replace(/-/g, '')}`;
    console.log(`[wpp-provision] Account number: ${accountNumber}`);

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

    if (existingIntegration) {
      // Use existing integration
      integrationId = existingIntegration.id;
      console.log(`[wpp-provision] Using existing integration: ${integrationId}`);

      // Update settings with account number if needed
      if (!existingIntegration.settings?.wppAccountNumber) {
        await supabase
          .from('messenger_integrations')
          .update({
            settings: {
              ...existingIntegration.settings,
              wppAccountNumber: accountNumber,
            },
          })
          .eq('id', integrationId);
      }
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
          is_enabled: true,
          settings: {
            wppAccountNumber: accountNumber,
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

    // Initialize WPP client with global API key
    const wpp = new WppMsgClient({
      baseUrl: WPP_BASE_URL,
      apiKey: WPP_API_KEY,
    });

    // Build webhook URL
    const webhookUrl = `${SUPABASE_URL}/functions/v1/wpp-webhook?account=${accountNumber}`;
    console.log(`[wpp-provision] Webhook URL: ${webhookUrl}`);

    // Start account and get QR if needed
    const result = await wpp.ensureAccountWithQr(accountNumber, webhookUrl, 30);
    console.log(`[wpp-provision] WPP result state: ${result.state}`);

    // Build response
    const response: ProvisionResponse = {
      success: true,
      status: result.state === 'qr' ? 'qr_issued' : 
              result.state === 'connected' ? 'connected' : 
              result.state === 'error' ? 'error' : 'starting',
      integration_id: integrationId,
      account_number: accountNumber,
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
