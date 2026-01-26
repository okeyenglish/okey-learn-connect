import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AISettings {
  openaiApiKey: string;
  isEnabled: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get organization ID from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organizationId = profile.organization_id;

    switch (req.method) {
      case 'GET':
        return await getAISettings(supabase, organizationId);
      case 'POST':
        const body = await req.json();
        if (body.action === 'test') {
          return await testAIConnection(supabase, organizationId);
        }
        return await saveAISettings(supabase, organizationId, body);
      case 'DELETE':
        return await deleteAISettings(supabase, organizationId);
      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('AI settings error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getAISettings(supabase: any, organizationId: string): Promise<Response> {
  console.log('[ai-settings] Getting settings for org:', organizationId);
  
  try {
    const { data: messengerSettings, error } = await supabase
      .from('messenger_settings')
      .select('settings, is_enabled')
      .eq('organization_id', organizationId)
      .eq('messenger_type', 'openai')
      .maybeSingle();

    if (error) {
      console.error('[ai-settings] Error fetching settings:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch settings', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ai-settings] Found settings:', messengerSettings ? 'yes' : 'no');

    const settings: AISettings | null = messengerSettings ? {
      openaiApiKey: messengerSettings.settings?.openaiApiKey 
        ? '••••••••' + messengerSettings.settings.openaiApiKey.slice(-4) 
        : '',
      isEnabled: messengerSettings.is_enabled || false
    } : null;

    return new Response(
      JSON.stringify({ settings }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[ai-settings] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Unexpected error', details: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function saveAISettings(
  supabase: any,
  organizationId: string,
  body: { openaiApiKey?: string; isEnabled?: boolean }
): Promise<Response> {
  console.log('[ai-settings] Saving settings for org:', organizationId);
  const { openaiApiKey, isEnabled = true } = body;

  // Get existing settings to preserve API key if not provided
  const { data: existing, error: existingError } = await supabase
    .from('messenger_settings')
    .select('id, settings')
    .eq('organization_id', organizationId)
    .eq('messenger_type', 'openai')
    .maybeSingle();

  if (existingError) {
    console.error('[ai-settings] Error fetching existing settings:', existingError);
  }

  console.log('[ai-settings] Existing settings:', existing ? 'found' : 'not found');

  // If apiKey starts with bullets (masked), use existing
  const actualApiKey = openaiApiKey?.startsWith('••') 
    ? existing?.settings?.openaiApiKey 
    : openaiApiKey || existing?.settings?.openaiApiKey;

  if (!actualApiKey) {
    return new Response(
      JSON.stringify({ error: 'OpenAI API Key is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const settingsData = {
    openaiApiKey: actualApiKey
  };

  let saveError;
  
  if (existing?.id) {
    // Update existing record
    console.log('[ai-settings] Updating existing record:', existing.id);
    const { error } = await supabase
      .from('messenger_settings')
      .update({
        settings: settingsData,
        is_enabled: isEnabled,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id);
    saveError = error;
  } else {
    // Insert new record
    console.log('[ai-settings] Inserting new record');
    const { error } = await supabase
      .from('messenger_settings')
      .insert({
        organization_id: organizationId,
        messenger_type: 'openai',
        settings: settingsData,
        is_enabled: isEnabled
      });
    saveError = error;
  }

  if (saveError) {
    console.error('[ai-settings] Error saving settings:', saveError);
    return new Response(
      JSON.stringify({ error: 'Failed to save settings', details: saveError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('[ai-settings] Settings saved successfully');

  return new Response(
    JSON.stringify({ 
      success: true,
      settings: {
        openaiApiKey: '••••••••' + actualApiKey.slice(-4),
        isEnabled
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function testAIConnection(supabase: any, organizationId: string): Promise<Response> {
  // Get settings
  const { data: messengerSettings } = await supabase
    .from('messenger_settings')
    .select('settings, is_enabled')
    .eq('organization_id', organizationId)
    .eq('messenger_type', 'openai')
    .maybeSingle();

  const openaiApiKey = messengerSettings?.settings?.openaiApiKey;

  if (!openaiApiKey) {
    return new Response(
      JSON.stringify({ success: false, error: 'OpenAI API Key not configured' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Test with a simple models list request
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`
      }
    });

    if (response.ok) {
      return new Response(
        JSON.stringify({ success: true, message: 'OpenAI API connection successful' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      const error = await response.json().catch(() => ({}));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.error?.message || `HTTP ${response.status}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Connection failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function deleteAISettings(supabase: any, organizationId: string): Promise<Response> {
  const { error } = await supabase
    .from('messenger_settings')
    .delete()
    .eq('organization_id', organizationId)
    .eq('messenger_type', 'openai');

  if (error) {
    console.error('Error deleting AI settings:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete settings' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
