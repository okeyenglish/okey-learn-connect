import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import {
  handleCors,
  successResponse,
  errorResponse,
  getErrorMessage,
} from '../_shared/types.ts';

// Get OnlinePBX config from messenger_settings
async function getOnlinePBXConfig(supabase: any, organizationId: string) {
  const { data: messengerSettings, error: msError } = await supabase
    .from('messenger_settings')
    .select('settings, is_enabled')
    .eq('organization_id', organizationId)
    .eq('messenger_type', 'onlinepbx')
    .maybeSingle();

  if (!msError && messengerSettings?.settings) {
    const settings = messengerSettings.settings;
    return {
      pbx_domain: settings.pbxDomain || settings.pbx_domain,
      key_id: settings.keyId || settings.key_id,
      key_secret: settings.keySecret || settings.key_secret,
      api_key_id: settings.apiKeyId || settings.api_key_id,
      api_key_secret: settings.apiKeySecret || settings.api_key_secret,
      is_enabled: messengerSettings.is_enabled,
      // SIP settings for WebRTC
      sip_domain: settings.sipDomain || settings.sip_domain,
      sip_wss_url: settings.sipWssUrl || settings.sip_wss_url,
    };
  }

  return null;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { action, user_id, call_id, target_extension } = await req.json();

    console.log('[onlinepbx-pickup] Request:', { action, user_id, call_id, target_extension });

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name, extension_number, organization_id')
      .eq('id', user_id)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    if (!profile.organization_id) {
      throw new Error('User has no organization assigned');
    }

    const config = await getOnlinePBXConfig(supabaseClient, profile.organization_id);

    if (!config || !config.is_enabled) {
      throw new Error('OnlinePBX не настроен или отключен');
    }

    const keyId = config.key_id || config.api_key_id;
    const keySecret = config.key_secret || config.api_key_secret;

    if (!config.pbx_domain || !keyId || !keySecret) {
      throw new Error('OnlinePBX настроен неполностью');
    }

    const userExtension = profile.extension_number;
    if (!userExtension) {
      throw new Error('У вас не настроен внутренний номер. Укажите его в профиле.');
    }

    const pbxDomain = config.pbx_domain;
    const headers = {
      'x-pbx-authentication': `${keyId}:${keySecret}`,
      'Content-Type': 'application/json',
    };

    let result: any;

    switch (action) {
      case 'pickup': {
        // Redirect/pickup an incoming call to user's extension
        // Using OnlinePBX redirect API
        const redirectUrl = `https://api2.onlinepbx.ru/${pbxDomain}/call/redirect.json`;
        
        const redirectBody = {
          call_id: call_id,
          to: userExtension,
        };

        console.log('[onlinepbx-pickup] Redirecting call:', redirectBody);

        const redirectResponse = await fetch(redirectUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(redirectBody),
        });

        result = await redirectResponse.json();
        console.log('[onlinepbx-pickup] Redirect response:', result);

        if (!redirectResponse.ok || (result.status !== '1' && result.status !== 1)) {
          // Try alternative: originate a call from the extension to pickup
          const originateUrl = `https://api2.onlinepbx.ru/${pbxDomain}/call/now.json`;
          const originateBody = {
            from: userExtension,
            to: call_id, // Use call_id as target for pickup
          };

          console.log('[onlinepbx-pickup] Trying originate method:', originateBody);
          
          const originateResponse = await fetch(originateUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(originateBody),
          });

          result = await originateResponse.json();
          console.log('[onlinepbx-pickup] Originate response:', result);
        }
        break;
      }

      case 'transfer': {
        // Transfer an active call to another extension
        const transferUrl = `https://api2.onlinepbx.ru/${pbxDomain}/call/redirect.json`;
        
        const transferBody = {
          call_id: call_id,
          to: target_extension || userExtension,
        };

        console.log('[onlinepbx-pickup] Transferring call:', transferBody);

        const transferResponse = await fetch(transferUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(transferBody),
        });

        result = await transferResponse.json();
        console.log('[onlinepbx-pickup] Transfer response:', result);
        break;
      }

      case 'get-sip-config': {
        // Return SIP configuration for WebRTC client
        return successResponse({
          success: true,
          sip_config: {
            domain: config.sip_domain || `${pbxDomain}.onlinepbx.ru`,
            wss_url: config.sip_wss_url || `wss://${pbxDomain}.onlinepbx.ru:8089/ws`,
            extension: userExtension,
            // Note: SIP password should be configured separately in user profile
            // or retrieved from a secure source
          },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Log the action
    await supabaseClient.from('webhook_logs').insert({
      messenger_type: 'system',
      event_type: `onlinepbx_${action}`,
      webhook_data: {
        user_id,
        call_id,
        target_extension,
        user_extension: userExtension,
        response: result,
        timestamp: new Date().toISOString(),
      },
      processed: true,
    });

    const isSuccess = result?.status === '1' || result?.status === 1;

    return successResponse({
      success: isSuccess,
      message: isSuccess 
        ? `Действие "${action}" выполнено успешно`
        : `Ошибка: ${result?.errorMessage || result?.comment || 'Unknown error'}`,
      data: result,
    });

  } catch (error) {
    console.error('[onlinepbx-pickup] Error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});
