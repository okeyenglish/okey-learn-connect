import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log('[messenger-settings-list] Request received');
  
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

    // Fetch all messenger settings for organization
    const { data: settings, error: settingsError } = await supabase
      .from('messenger_settings')
      .select('messenger_type, settings, is_enabled, updated_at')
      .eq('organization_id', organizationId);

    if (settingsError) {
      console.error('[messenger-settings-list] Error fetching settings:', settingsError);
      throw settingsError;
    }

    // Transform settings - only expose non-sensitive data (webhook keys are fine)
    const transformedSettings = (settings || []).map(s => {
      const settingsObj = s.settings as Record<string, unknown> || {};
      
      // Extract webhook key - try both camelCase and snake_case
      const webhookKey = (settingsObj.webhookKey as string) || (settingsObj.webhook_key as string) || '';
      
      return {
        messenger_type: s.messenger_type,
        is_enabled: s.is_enabled,
        updated_at: s.updated_at,
        settings: {
          webhookKey,
          webhook_key: webhookKey, // Include both formats for compatibility
        }
      };
    });

    console.log('[messenger-settings-list] Returning', transformedSettings.length, 'settings');

    return new Response(
      JSON.stringify({
        success: true,
        settings: transformedSettings
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[messenger-settings-list] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
