import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mask sensitive data, showing only last 4 characters
function maskSecret(value: string | undefined): string {
  if (!value) return '';
  if (value.length <= 4) return '••••';
  return '••••' + value.slice(-4);
}

// Generate a unique webhook key
function generateWebhookKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let key = '';
  for (let i = 0; i < 24; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

serve(async (req) => {
  console.log('[onlinepbx-settings] Boot marker');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header and verify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only admins and owners can manage settings
    if (!['admin', 'owner'].includes(profile.role || '')) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organizationId = profile.organization_id;

    // GET - retrieve current settings
    if (req.method === 'GET') {
      const { data: settings, error } = await supabase
        .from('messenger_settings')
        .select('settings, is_enabled, updated_at')
        .eq('organization_id', organizationId)
        .eq('messenger_type', 'onlinepbx')
        .maybeSingle();

      if (error) {
        console.error('[onlinepbx-settings] Error fetching settings:', error);
        throw error;
      }

      if (!settings) {
        return new Response(
          JSON.stringify({
            success: true,
            settings: {
              pbxDomain: '',
              apiKeyId: '',
              apiKeySecret: '',
              webhookKey: '',
            },
            isEnabled: false,
            configured: false,
            webhookUrl: ''
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const webhookKey = settings.settings?.webhook_key || '';
      const webhookUrl = webhookKey 
        ? `https://api.academyos.ru/functions/v1/onlinepbx-webhook?key=${webhookKey}`
        : 'https://api.academyos.ru/functions/v1/onlinepbx-webhook';

      // Mask sensitive data
      const maskedSettings = {
        pbxDomain: settings.settings?.pbxDomain || settings.settings?.pbx_domain || '',
        apiKeyId: maskSecret(settings.settings?.apiKeyId || settings.settings?.api_key_id),
        apiKeySecret: maskSecret(settings.settings?.apiKeySecret || settings.settings?.api_key_secret),
        webhookKey: webhookKey,
      };

      return new Response(
        JSON.stringify({
          success: true,
          settings: maskedSettings,
          isEnabled: settings.is_enabled,
          configured: true,
          updatedAt: settings.updated_at,
          webhookUrl
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST - save settings
    if (req.method === 'POST') {
      const { pbxDomain, apiKeyId, apiKeySecret, isEnabled, regenerateWebhookKey } = await req.json();

      if (!pbxDomain) {
        return new Response(
          JSON.stringify({ error: 'PBX domain is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get existing settings to preserve unchanged masked values
      const { data: existing } = await supabase
        .from('messenger_settings')
        .select('settings')
        .eq('organization_id', organizationId)
        .eq('messenger_type', 'onlinepbx')
        .maybeSingle();

      // Determine actual values (use existing if masked placeholder received)
      const actualKeyId = apiKeyId?.startsWith('••••') 
        ? (existing?.settings?.apiKeyId || existing?.settings?.api_key_id || '')
        : apiKeyId;
      const actualKeySecret = apiKeySecret?.startsWith('••••')
        ? (existing?.settings?.apiKeySecret || existing?.settings?.api_key_secret || '')
        : apiKeySecret;

      // Generate or keep webhook key
      let webhookKey = existing?.settings?.webhook_key || '';
      if (!webhookKey || regenerateWebhookKey) {
        webhookKey = generateWebhookKey();
        console.log('[onlinepbx-settings] Generated new webhook key for org:', organizationId);
      }

      const settingsData = {
        pbxDomain,
        apiKeyId: actualKeyId,
        apiKeySecret: actualKeySecret,
        webhook_key: webhookKey,
      };

      const webhookUrl = `https://api.academyos.ru/functions/v1/onlinepbx-webhook?key=${webhookKey}`;

      if (existing) {
        const { error } = await supabase
          .from('messenger_settings')
          .update({
            settings: settingsData,
            is_enabled: isEnabled ?? false,
            updated_at: new Date().toISOString()
          })
          .eq('organization_id', organizationId)
          .eq('messenger_type', 'onlinepbx');

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('messenger_settings')
          .insert({
            organization_id: organizationId,
            messenger_type: 'onlinepbx',
            settings: settingsData,
            is_enabled: isEnabled ?? false
          });

        if (error) throw error;
      }

      console.log('[onlinepbx-settings] Settings saved for org:', organizationId);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Настройки сохранены',
          webhookUrl,
          webhookKey
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE - remove settings
    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('messenger_settings')
        .delete()
        .eq('organization_id', organizationId)
        .eq('messenger_type', 'onlinepbx');

      if (error) throw error;

      console.log('[onlinepbx-settings] Settings deleted for org:', organizationId);

      return new Response(
        JSON.stringify({ success: true, message: 'Настройки удалены' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[onlinepbx-settings] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
