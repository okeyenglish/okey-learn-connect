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

// Authenticate with OnlinePBX and get key_id + key
async function authenticateOnlinePBX(pbxDomain: string, authKey: string): Promise<{ keyId: string; keySecret: string } | null> {
  try {
    const url = `https://api2.onlinepbx.ru/${pbxDomain}/auth.json`;
    console.log('[onlinepbx-settings] Authenticating with OnlinePBX:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth_key: authKey })
    });
    
    const data = await response.json();
    console.log('[onlinepbx-settings] Auth response:', JSON.stringify(data));
    
    if (data.status === '1' || data.status === 1) {
      return {
        keyId: data.data?.key_id || data.key_id,
        keySecret: data.data?.key || data.key
      };
    }
    
    console.error('[onlinepbx-settings] Auth failed:', data);
    return null;
  } catch (error) {
    console.error('[onlinepbx-settings] Auth error:', error);
    return null;
  }
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
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!userRole) {
      console.log('[onlinepbx-settings] User not admin:', user.id);
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
              authKey: '',
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

      // Mask sensitive data - support both old and new format
      const maskedSettings = {
        pbxDomain: settings.settings?.pbxDomain || settings.settings?.pbx_domain || '',
        authKey: maskSecret(settings.settings?.authKey || settings.settings?.auth_key),
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
      const { pbxDomain, authKey, isEnabled, regenerateWebhookKey } = await req.json();

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

      // Determine actual auth key (use existing if masked placeholder received)
      let actualAuthKey = authKey?.startsWith('••••') 
        ? (existing?.settings?.authKey || existing?.settings?.auth_key || '')
        : authKey;

      // Get or reuse key_id and key
      let keyId = existing?.settings?.keyId || existing?.settings?.key_id || '';
      let keySecret = existing?.settings?.keySecret || existing?.settings?.key_secret || '';

      // If we have a new auth key, authenticate to get key_id and key
      if (actualAuthKey && !authKey?.startsWith('••••')) {
        const authResult = await authenticateOnlinePBX(pbxDomain, actualAuthKey);
        if (!authResult) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Не удалось авторизоваться в OnlinePBX. Проверьте Auth Key и домен.' 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        keyId = authResult.keyId;
        keySecret = authResult.keySecret;
        console.log('[onlinepbx-settings] Got new keys from OnlinePBX');
      }

      // Generate or keep webhook key
      let webhookKey = existing?.settings?.webhook_key || '';
      if (!webhookKey || regenerateWebhookKey) {
        webhookKey = generateWebhookKey();
        console.log('[onlinepbx-settings] Generated new webhook key for org:', organizationId);
      }

      const settingsData = {
        pbxDomain,
        authKey: actualAuthKey,
        keyId,
        keySecret,
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
