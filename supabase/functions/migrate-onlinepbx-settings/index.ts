import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('[migrate-onlinepbx-settings] Starting migration...');
    
    const migrationResults: Array<{
      organization_id: string;
      status: 'migrated' | 'skipped' | 'error';
      message: string;
    }> = [];
    
    // Get all organizations with OnlinePBX settings in system_settings
    const { data: systemSettings, error: fetchError } = await supabase
      .from('system_settings')
      .select('organization_id, key, value')
      .in('key', ['onlinepbx_domain', 'onlinepbx_api_key_id', 'onlinepbx_api_key_secret', 'telephony_settings'])
      .not('organization_id', 'is', null);
    
    if (fetchError) {
      console.error('[migrate-onlinepbx-settings] Error fetching system_settings:', fetchError);
      throw fetchError;
    }
    
    console.log(`[migrate-onlinepbx-settings] Found ${systemSettings?.length || 0} system_settings entries`);
    
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
    
    console.log(`[migrate-onlinepbx-settings] Found ${orgSettingsMap.size} organizations with OnlinePBX settings`);
    
    // Process each organization
    for (const [organizationId, settings] of orgSettingsMap) {
      try {
        // Check if already migrated
        const { data: existing } = await supabase
          .from('messenger_settings')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('messenger_type', 'onlinepbx')
          .maybeSingle();
        
        if (existing) {
          console.log(`[migrate-onlinepbx-settings] Organization ${organizationId} already has OnlinePBX in messenger_settings, skipping`);
          migrationResults.push({
            organization_id: organizationId,
            status: 'skipped',
            message: 'Already migrated to messenger_settings'
          });
          continue;
        }
        
        // Build settings object
        let pbxSettings: Record<string, string> = {};
        
        // Try telephony_settings first (newer format)
        if (settings.telephony_settings) {
          try {
            const parsed = JSON.parse(settings.telephony_settings);
            pbxSettings = {
              pbxDomain: parsed.pbx_domain || parsed.pbxDomain || '',
              apiKeyId: parsed.api_key_id || parsed.apiKeyId || '',
              apiKeySecret: parsed.api_key_secret || parsed.apiKeySecret || ''
            };
          } catch (e) {
            console.warn(`[migrate-onlinepbx-settings] Failed to parse telephony_settings for ${organizationId}:`, e);
          }
        }
        
        // Fallback to individual keys
        if (!pbxSettings.pbxDomain) {
          pbxSettings = {
            pbxDomain: settings.onlinepbx_domain || '',
            apiKeyId: settings.onlinepbx_api_key_id || '',
            apiKeySecret: settings.onlinepbx_api_key_secret || ''
          };
        }
        
        // Skip if no actual domain configured
        if (!pbxSettings.pbxDomain) {
          console.log(`[migrate-onlinepbx-settings] Organization ${organizationId} has no pbxDomain, skipping`);
          migrationResults.push({
            organization_id: organizationId,
            status: 'skipped',
            message: 'No pbxDomain configured'
          });
          continue;
        }
        
        // Insert into messenger_settings
        const { error: insertError } = await supabase
          .from('messenger_settings')
          .insert({
            organization_id: organizationId,
            messenger_type: 'onlinepbx',
            settings: pbxSettings,
            is_enabled: true
          });
        
        if (insertError) {
          console.error(`[migrate-onlinepbx-settings] Failed to insert for ${organizationId}:`, insertError);
          migrationResults.push({
            organization_id: organizationId,
            status: 'error',
            message: insertError.message
          });
          continue;
        }
        
        console.log(`[migrate-onlinepbx-settings] Successfully migrated settings for ${organizationId}`);
        migrationResults.push({
          organization_id: organizationId,
          status: 'migrated',
          message: `Migrated with domain: ${pbxSettings.pbxDomain}`
        });
        
      } catch (orgError) {
        console.error(`[migrate-onlinepbx-settings] Error processing ${organizationId}:`, orgError);
        migrationResults.push({
          organization_id: organizationId,
          status: 'error',
          message: orgError instanceof Error ? orgError.message : 'Unknown error'
        });
      }
    }
    
    const summary = {
      total: migrationResults.length,
      migrated: migrationResults.filter(r => r.status === 'migrated').length,
      skipped: migrationResults.filter(r => r.status === 'skipped').length,
      errors: migrationResults.filter(r => r.status === 'error').length,
      details: migrationResults
    };
    
    console.log('[migrate-onlinepbx-settings] Migration complete:', summary);
    
    return new Response(
      JSON.stringify({ success: true, ...summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[migrate-onlinepbx-settings] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});