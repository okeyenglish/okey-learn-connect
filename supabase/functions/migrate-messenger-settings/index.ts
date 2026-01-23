import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MigrationResult {
  organization_id: string;
  messenger_type: string;
  status: 'migrated' | 'skipped' | 'error';
  message: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('[migrate-messenger-settings] Starting migration...');
    
    const migrationResults: MigrationResult[] = [];
    
    // Get all system_settings entries related to messengers
    const { data: systemSettings, error: fetchError } = await supabase
      .from('system_settings')
      .select('organization_id, key, value')
      .or('key.ilike.%wappi%,key.ilike.%green_api%,key.ilike.%telegram%,key.ilike.%whatsapp%,key.ilike.%max_%')
      .not('organization_id', 'is', null);
    
    if (fetchError) {
      console.error('[migrate-messenger-settings] Error fetching system_settings:', fetchError);
      throw fetchError;
    }
    
    console.log(`[migrate-messenger-settings] Found ${systemSettings?.length || 0} system_settings entries`);
    
    // Group settings by organization_id
    const orgSettingsMap = new Map<string, Record<string, string>>();
    
    for (const setting of systemSettings || []) {
      if (!setting.organization_id) continue;
      
      if (!orgSettingsMap.has(setting.organization_id)) {
        orgSettingsMap.set(setting.organization_id, {});
      }
      
      const orgSettings = orgSettingsMap.get(setting.organization_id)!;
      orgSettings[setting.key] = setting.value;
    }
    
    console.log(`[migrate-messenger-settings] Found ${orgSettingsMap.size} organizations with messenger settings`);
    
    // Process each organization
    for (const [organizationId, settings] of orgSettingsMap) {
      // Migrate Wappi WhatsApp settings
      await migrateWappiWhatsApp(supabase, organizationId, settings, migrationResults);
      
      // Migrate Wappi Telegram settings
      await migrateWappiTelegram(supabase, organizationId, settings, migrationResults);
      
      // Migrate Green API (standard WhatsApp)
      await migrateGreenApi(supabase, organizationId, settings, migrationResults, 'whatsapp');
      
      // Migrate MAX Green API
      await migrateGreenApi(supabase, organizationId, settings, migrationResults, 'max');
    }
    
    const summary = {
      total: migrationResults.length,
      migrated: migrationResults.filter(r => r.status === 'migrated').length,
      skipped: migrationResults.filter(r => r.status === 'skipped').length,
      errors: migrationResults.filter(r => r.status === 'error').length,
      details: migrationResults
    };
    
    console.log('[migrate-messenger-settings] Migration complete:', summary);
    
    return new Response(
      JSON.stringify({ success: true, ...summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[migrate-messenger-settings] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function migrateWappiWhatsApp(
  supabase: any, 
  organizationId: string, 
  settings: Record<string, string>,
  results: MigrationResult[]
) {
  const messengerType = 'wappi_whatsapp';
  
  // Check for Wappi WhatsApp keys
  const apiToken = settings['wappi_api_token'] || settings['WAPPI_API_TOKEN'];
  const profileId = settings['wappi_profile_id'] || settings['WAPPI_PROFILE_ID'];
  
  if (!apiToken && !profileId) {
    return; // No Wappi WhatsApp settings to migrate
  }
  
  try {
    // Check if already migrated
    const { data: existing } = await supabase
      .from('messenger_settings')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('messenger_type', messengerType)
      .maybeSingle();
    
    if (existing) {
      results.push({
        organization_id: organizationId,
        messenger_type: messengerType,
        status: 'skipped',
        message: 'Already exists in messenger_settings'
      });
      return;
    }
    
    const wappiSettings = {
      apiToken: apiToken || '',
      profileId: profileId || ''
    };
    
    const { error: insertError } = await supabase
      .from('messenger_settings')
      .insert({
        organization_id: organizationId,
        messenger_type: messengerType,
        settings: wappiSettings,
        is_enabled: !!apiToken
      });
    
    if (insertError) {
      results.push({
        organization_id: organizationId,
        messenger_type: messengerType,
        status: 'error',
        message: insertError.message
      });
      return;
    }
    
    console.log(`[migrate-messenger-settings] Migrated ${messengerType} for ${organizationId}`);
    results.push({
      organization_id: organizationId,
      messenger_type: messengerType,
      status: 'migrated',
      message: `Migrated with profileId: ${profileId || 'N/A'}`
    });
    
  } catch (error) {
    results.push({
      organization_id: organizationId,
      messenger_type: messengerType,
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function migrateWappiTelegram(
  supabase: any, 
  organizationId: string, 
  settings: Record<string, string>,
  results: MigrationResult[]
) {
  const messengerType = 'wappi_telegram';
  
  // Check for Wappi Telegram keys
  const apiToken = settings['wappi_telegram_api_token'] || settings['WAPPI_TELEGRAM_API_TOKEN'];
  const profileId = settings['wappi_telegram_profile_id'] || settings['WAPPI_TELEGRAM_PROFILE_ID'];
  
  if (!apiToken && !profileId) {
    return; // No Wappi Telegram settings to migrate
  }
  
  try {
    // Check if already migrated
    const { data: existing } = await supabase
      .from('messenger_settings')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('messenger_type', messengerType)
      .maybeSingle();
    
    if (existing) {
      results.push({
        organization_id: organizationId,
        messenger_type: messengerType,
        status: 'skipped',
        message: 'Already exists in messenger_settings'
      });
      return;
    }
    
    const telegramSettings = {
      apiToken: apiToken || '',
      profileId: profileId || ''
    };
    
    const { error: insertError } = await supabase
      .from('messenger_settings')
      .insert({
        organization_id: organizationId,
        messenger_type: messengerType,
        settings: telegramSettings,
        is_enabled: !!apiToken
      });
    
    if (insertError) {
      results.push({
        organization_id: organizationId,
        messenger_type: messengerType,
        status: 'error',
        message: insertError.message
      });
      return;
    }
    
    console.log(`[migrate-messenger-settings] Migrated ${messengerType} for ${organizationId}`);
    results.push({
      organization_id: organizationId,
      messenger_type: messengerType,
      status: 'migrated',
      message: `Migrated with profileId: ${profileId || 'N/A'}`
    });
    
  } catch (error) {
    results.push({
      organization_id: organizationId,
      messenger_type: messengerType,
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function migrateGreenApi(
  supabase: any, 
  organizationId: string, 
  settings: Record<string, string>,
  results: MigrationResult[],
  type: 'whatsapp' | 'max'
) {
  const messengerType = type === 'max' ? 'max_green_api' : 'green_api';
  const prefix = type === 'max' ? 'MAX_' : '';
  
  // Check for Green API keys
  const idInstance = settings[`${prefix}GREEN_API_ID_INSTANCE`] || 
                     settings[`${prefix.toLowerCase()}green_api_id_instance`] ||
                     (type === 'whatsapp' ? settings['GREEN_API_ID_INSTANCE'] : null);
  const apiTokenInstance = settings[`${prefix}GREEN_API_TOKEN_INSTANCE`] || 
                           settings[`${prefix.toLowerCase()}green_api_token_instance`] ||
                           (type === 'whatsapp' ? settings['GREEN_API_TOKEN_INSTANCE'] : null);
  
  if (!idInstance && !apiTokenInstance) {
    return; // No Green API settings to migrate
  }
  
  try {
    // Check if already migrated
    const { data: existing } = await supabase
      .from('messenger_settings')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('messenger_type', messengerType)
      .maybeSingle();
    
    if (existing) {
      results.push({
        organization_id: organizationId,
        messenger_type: messengerType,
        status: 'skipped',
        message: 'Already exists in messenger_settings'
      });
      return;
    }
    
    const greenApiSettings = {
      idInstance: idInstance || '',
      apiTokenInstance: apiTokenInstance || ''
    };
    
    const { error: insertError } = await supabase
      .from('messenger_settings')
      .insert({
        organization_id: organizationId,
        messenger_type: messengerType,
        settings: greenApiSettings,
        is_enabled: !!(idInstance && apiTokenInstance)
      });
    
    if (insertError) {
      results.push({
        organization_id: organizationId,
        messenger_type: messengerType,
        status: 'error',
        message: insertError.message
      });
      return;
    }
    
    console.log(`[migrate-messenger-settings] Migrated ${messengerType} for ${organizationId}`);
    results.push({
      organization_id: organizationId,
      messenger_type: messengerType,
      status: 'migrated',
      message: `Migrated with idInstance: ${idInstance?.slice(0, 8) || 'N/A'}...`
    });
    
  } catch (error) {
    results.push({
      organization_id: organizationId,
      messenger_type: messengerType,
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}