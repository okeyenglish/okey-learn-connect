import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import {
  handleCors,
  successResponse,
  errorResponse,
  getErrorMessage,
  type OnlinePBXCallRequest,
  type OnlinePBXCallResponse,
} from '../_shared/types.ts';

// Get OnlinePBX config from messenger_settings (with fallback to system_settings for migration)
async function getOnlinePBXConfig(supabase: any, organizationId: string) {
  // First try messenger_settings (new approach)
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
      // New format: keyId and keySecret from auth.json
      key_id: settings.keyId || settings.key_id,
      key_secret: settings.keySecret || settings.key_secret,
      // Legacy format fallback
      api_key_id: settings.apiKeyId || settings.api_key_id,
      api_key_secret: settings.apiKeySecret || settings.api_key_secret,
      is_enabled: messengerSettings.is_enabled
    };
  }

  // Fallback to system_settings (legacy)
  const { data: systemSettings, error: ssError } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('organization_id', organizationId)
    .eq('setting_key', 'onlinepbx_config')
    .maybeSingle();

  if (!ssError && systemSettings?.setting_value) {
    return systemSettings.setting_value;
  }

  return null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { to_number, from_user } = await req.json();

    console.log('OnlinePBX call request:', { to_number, from_user });

    // Get user profile for operator information including extension number and organization
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name, branch, extension_number, organization_id')
      .eq('id', from_user)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    if (!profile.organization_id) {
      throw new Error('User has no organization assigned');
    }

    // Get OnlinePBX config from messenger_settings or system_settings
    const config = await getOnlinePBXConfig(supabaseClient, profile.organization_id);

    if (!config) {
      throw new Error('OnlinePBX не настроен для вашей организации. Обратитесь к администратору.');
    }

    if (!config.is_enabled) {
      throw new Error('Интеграция с OnlinePBX отключена для вашей организации');
    }

    // Check for new format (keyId + keySecret) or legacy format (apiKeyId + apiKeySecret)
    const keyId = config.key_id || config.api_key_id;
    const keySecret = config.key_secret || config.api_key_secret;

    if (!config.pbx_domain || !keyId || !keySecret) {
      throw new Error('OnlinePBX настроен неполностью. Проверьте настройки интеграции.');
    }

    // Get operator extension from user profile
    const operatorExtension = profile.extension_number || '101';
    
    if (!profile.extension_number) {
      console.warn('User has no extension_number configured, using default 101');
    }

    // Get client ID from phone number
    const { data: client, error: clientError } = await supabaseClient
      .from('clients')
      .select('id')
      .eq('phone', to_number)
      .single();

    if (clientError) {
      console.log('Client not found for phone number:', to_number);
    }

    // Create call log entry
    const { data: callLog, error: callLogError } = await supabaseClient
      .from('call_logs')
      .insert({
        client_id: client?.id,
        phone_number: to_number,
        direction: 'outgoing',
        status: 'initiated',
        initiated_by: from_user,
        organization_id: profile.organization_id
      })
      .select()
      .single();

    if (callLogError) {
      console.error('Failed to create call log:', callLogError);
    }

    // OnlinePBX API v3 - use key_id:key format for authentication
    const pbxDomain = config.pbx_domain;
    const apiPath = `/${pbxDomain}/call/now.json`;
    const onlinePbxUrl = `https://api2.onlinepbx.ru${apiPath}`;

    const onlinePbxBody = {
      from: operatorExtension,
      to: to_number
    };

    // Authentication header: key_id:key
    const onlinePbxHeaders = {
      'x-pbx-authentication': `${keyId}:${keySecret}`,
      'Content-Type': 'application/json'
    };

    console.log('Making OnlinePBX API call:', {
      url: onlinePbxUrl,
      from: operatorExtension,
      to: to_number,
      authHeader: `${keyId?.substring(0, 4)}...:****`
    });

    const response = await fetch(onlinePbxUrl, {
      method: 'POST',
      headers: onlinePbxHeaders,
      body: JSON.stringify(onlinePbxBody)
    });

    const responseData = await response.json();
    
    console.log('OnlinePBX call response:', responseData);

    // Update call log with result
    if (callLog) {
      let callStatus = 'failed';
      if (response.ok && (responseData.status === '1' || responseData.status === 1)) {
        callStatus = 'answered';
      } else if (response.ok && responseData.status === '0') {
        callStatus = responseData.errorCode === 'API_KEY_CHECK_FAILED' ? 'failed' : 'busy';
      }

      await supabaseClient
        .from('call_logs')
        .update({ 
          status: callStatus,
          ended_at: new Date().toISOString()
        })
        .eq('id', callLog.id);
    }

    if (!response.ok || (responseData.status !== '1' && responseData.status !== 1)) {
      console.error('OnlinePBX API error:', responseData);
      throw new Error(`OnlinePBX API error: ${responseData.errorMessage || responseData.comment || 'Unknown error'}`);
    }

    // Log the call request in webhook_logs
    await supabaseClient
      .from('webhook_logs')
      .insert({
        messenger_type: 'system',
        event_type: 'onlinepbx_call',
        webhook_data: {
          from_user: from_user,
          from_extension: operatorExtension,
          to_number: to_number,
          response: responseData,
          call_log_id: callLog?.id,
          timestamp: new Date().toISOString()
        },
        processed: true
      });

    return successResponse({
      success: true,
      message: 'Звонок инициирован через OnlinePBX',
      from_extension: operatorExtension,
      to_number: to_number,
      call_id: responseData.call_id || responseData.data?.call_id || null,
      call_log_id: callLog?.id
    });

  } catch (error) {
    console.error('OnlinePBX call error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});
