import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IntegrationPayload {
  id?: string;
  messenger_type: string;
  provider: string;
  name: string;
  is_primary?: boolean;
  is_enabled?: boolean;
  settings: Record<string, unknown>;
}

Deno.serve(async (req) => {
  console.log('[messenger-integrations] Request received:', req.method);

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
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
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
        JSON.stringify({ success: false, error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organizationId = profile.organization_id;

    // Handle different HTTP methods
    switch (req.method) {
      case 'GET': {
        // List all integrations for the organization
        const url = new URL(req.url);
        const messengerType = url.searchParams.get('messenger_type');

        let query = supabase
          .from('messenger_integrations')
          .select('*')
          .eq('organization_id', organizationId)
          .order('is_primary', { ascending: false })
          .order('created_at', { ascending: true });

        if (messengerType) {
          query = query.eq('messenger_type', messengerType);
        }

        const { data: integrations, error: listError } = await query;

        if (listError) {
          console.error('[messenger-integrations] List error:', listError);
          throw listError;
        }

        // Mask sensitive data in settings
        const maskedIntegrations = (integrations || []).map(int => ({
          ...int,
          settings: maskSensitiveSettings(int.settings as Record<string, unknown>)
        }));

        return new Response(
          JSON.stringify({ success: true, integrations: maskedIntegrations }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'POST': {
        // Create new integration
        const payload: IntegrationPayload = await req.json();
        
        if (!payload.messenger_type || !payload.provider || !payload.name) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing required fields: messenger_type, provider, name' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Generate unique webhook_key
        const webhookKey = generateWebhookKey();

        // If this is set as primary, unset other primaries first
        if (payload.is_primary) {
          await supabase
            .from('messenger_integrations')
            .update({ is_primary: false })
            .eq('organization_id', organizationId)
            .eq('messenger_type', payload.messenger_type);
        }

        // Check if this is the first integration of this type - make it primary
        const { count } = await supabase
          .from('messenger_integrations')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('messenger_type', payload.messenger_type);

        const isPrimary = payload.is_primary ?? (count === 0);

        const { data: newIntegration, error: createError } = await supabase
          .from('messenger_integrations')
          .insert({
            organization_id: organizationId,
            messenger_type: payload.messenger_type,
            provider: payload.provider,
            name: payload.name,
            is_primary: isPrimary,
            is_enabled: payload.is_enabled ?? true,
            webhook_key: webhookKey,
            settings: payload.settings || {}
          })
          .select()
          .single();

        if (createError) {
          console.error('[messenger-integrations] Create error:', createError);
          throw createError;
        }

        console.log('[messenger-integrations] Created integration:', newIntegration.id);

        return new Response(
          JSON.stringify({ 
            success: true, 
            integration: {
              ...newIntegration,
              settings: maskSensitiveSettings(newIntegration.settings as Record<string, unknown>)
            }
          }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'PUT': {
        // Update existing integration
        const payload: IntegrationPayload = await req.json();

        if (!payload.id) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing integration id' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify integration belongs to this organization
        const { data: existing, error: existingError } = await supabase
          .from('messenger_integrations')
          .select('*')
          .eq('id', payload.id)
          .eq('organization_id', organizationId)
          .single();

        if (existingError || !existing) {
          return new Response(
            JSON.stringify({ success: false, error: 'Integration not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Merge settings - preserve sensitive values if masked
        const existingSettings = existing.settings as Record<string, unknown> || {};
        const newSettings = payload.settings || {};
        const mergedSettings = mergeSettings(existingSettings, newSettings);

        // If setting as primary, unset other primaries first
        if (payload.is_primary && !existing.is_primary) {
          await supabase
            .from('messenger_integrations')
            .update({ is_primary: false })
            .eq('organization_id', organizationId)
            .eq('messenger_type', existing.messenger_type);
        }

        const updateData: Record<string, unknown> = {
          settings: mergedSettings,
          updated_at: new Date().toISOString()
        };

        if (payload.name !== undefined) updateData.name = payload.name;
        if (payload.provider !== undefined) updateData.provider = payload.provider;
        if (payload.is_primary !== undefined) updateData.is_primary = payload.is_primary;
        if (payload.is_enabled !== undefined) updateData.is_enabled = payload.is_enabled;

        const { data: updated, error: updateError } = await supabase
          .from('messenger_integrations')
          .update(updateData)
          .eq('id', payload.id)
          .select()
          .single();

        if (updateError) {
          console.error('[messenger-integrations] Update error:', updateError);
          throw updateError;
        }

        console.log('[messenger-integrations] Updated integration:', updated.id);

        return new Response(
          JSON.stringify({ 
            success: true, 
            integration: {
              ...updated,
              settings: maskSensitiveSettings(updated.settings as Record<string, unknown>)
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'DELETE': {
        const url = new URL(req.url);
        const integrationId = url.searchParams.get('id');

        if (!integrationId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing integration id' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify integration belongs to this organization
        const { data: existing, error: existingError } = await supabase
          .from('messenger_integrations')
          .select('*')
          .eq('id', integrationId)
          .eq('organization_id', organizationId)
          .single();

        if (existingError || !existing) {
          return new Response(
            JSON.stringify({ success: false, error: 'Integration not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: deleteError } = await supabase
          .from('messenger_integrations')
          .delete()
          .eq('id', integrationId);

        if (deleteError) {
          console.error('[messenger-integrations] Delete error:', deleteError);
          throw deleteError;
        }

        // If deleted was primary, make another one primary
        if (existing.is_primary) {
          const { data: nextIntegration } = await supabase
            .from('messenger_integrations')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('messenger_type', existing.messenger_type)
            .order('created_at', { ascending: true })
            .limit(1)
            .single();

          if (nextIntegration) {
            await supabase
              .from('messenger_integrations')
              .update({ is_primary: true })
              .eq('id', nextIntegration.id);
          }
        }

        console.log('[messenger-integrations] Deleted integration:', integrationId);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('[messenger-integrations] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Generate unique webhook key
function generateWebhookKey(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Mask sensitive settings for API response
function maskSensitiveSettings(settings: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['apiToken', 'api_token', 'apiKey', 'api_key', 'keySecret', 'key_secret', 'token', 'secret'];
  const masked = { ...settings };

  for (const key of Object.keys(masked)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      const value = masked[key];
      if (typeof value === 'string' && value.length > 0) {
        masked[key] = '••••••••' + value.slice(-4);
      }
    }
  }

  return masked;
}

// Merge settings, preserving sensitive values if the new value is masked
function mergeSettings(existing: Record<string, unknown>, updated: Record<string, unknown>): Record<string, unknown> {
  const merged = { ...existing };

  for (const [key, value] of Object.entries(updated)) {
    // If value starts with ••, keep the existing value (it's masked)
    if (typeof value === 'string' && value.startsWith('••')) {
      continue;
    }
    merged[key] = value;
  }

  return merged;
}
