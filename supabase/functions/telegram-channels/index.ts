import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramSettings {
  profileId: string;
  webhookUrl: string;
  isEnabled: boolean;
}

interface TelegramInstanceState {
  status: 'authorized' | 'not_authorized' | 'loading' | 'error';
  phone?: string;
  username?: string;
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const wappiApiToken = Deno.env.get('WAPPI_API_TOKEN');

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
        return await getTelegramSettings(supabase, organizationId, wappiApiToken);
      case 'POST':
        const body = await req.json();
        return await saveTelegramSettings(supabase, organizationId, body, wappiApiToken, supabaseUrl);
      case 'DELETE':
        return await deleteTelegramSettings(supabase, organizationId);
      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Telegram channels error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getTelegramSettings(
  supabase: any, 
  organizationId: string, 
  wappiApiToken: string | undefined
): Promise<Response> {
  const { data: messengerSettings, error } = await supabase
    .from('messenger_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('messenger_type', 'telegram')
    .maybeSingle();

  if (error) {
    console.error('Error fetching Telegram settings:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch settings' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let instanceState: TelegramInstanceState | null = null;
  
  if (messengerSettings?.settings?.profileId && wappiApiToken) {
    instanceState = await checkInstanceState(
      messengerSettings.settings.profileId,
      wappiApiToken
    );
  }

  const settings: TelegramSettings | null = messengerSettings ? {
    profileId: messengerSettings.settings?.profileId || '',
    webhookUrl: messengerSettings.settings?.webhookUrl || '',
    isEnabled: messengerSettings.is_enabled || false
  } : null;

  return new Response(
    JSON.stringify({ settings, instanceState }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function saveTelegramSettings(
  supabase: any,
  organizationId: string,
  body: { profileId: string; isEnabled?: boolean },
  wappiApiToken: string | undefined,
  supabaseUrl: string
): Promise<Response> {
  const { profileId, isEnabled = true } = body;

  if (!profileId) {
    return new Response(
      JSON.stringify({ error: 'Profile ID is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!wappiApiToken) {
    return new Response(
      JSON.stringify({ error: 'WAPPI_API_TOKEN not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check instance state
  const instanceState = await checkInstanceState(profileId, wappiApiToken);
  
  console.log('Telegram instance state:', instanceState);

  // Generate webhook URL
  const webhookUrl = `${supabaseUrl}/functions/v1/telegram-webhook`;

  // Save settings
  const settingsData = {
    profileId,
    webhookUrl
  };

  const { data: savedSettings, error: saveError } = await supabase
    .from('messenger_settings')
    .upsert({
      organization_id: organizationId,
      messenger_type: 'telegram',
      settings: settingsData,
      is_enabled: isEnabled,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'organization_id,messenger_type'
    })
    .select()
    .single();

  if (saveError) {
    console.error('Error saving Telegram settings:', saveError);
    return new Response(
      JSON.stringify({ error: 'Failed to save settings' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Setup webhook in Wappi.pro
  const webhookResult = await setupWebhook(profileId, webhookUrl, wappiApiToken);
  console.log('Webhook setup result:', webhookResult);

  const settings: TelegramSettings = {
    profileId,
    webhookUrl,
    isEnabled
  };

  return new Response(
    JSON.stringify({ 
      settings, 
      instanceState,
      webhookSetup: webhookResult
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function deleteTelegramSettings(
  supabase: any,
  organizationId: string
): Promise<Response> {
  const { error } = await supabase
    .from('messenger_settings')
    .delete()
    .eq('organization_id', organizationId)
    .eq('messenger_type', 'telegram');

  if (error) {
    console.error('Error deleting Telegram settings:', error);
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

async function checkInstanceState(
  profileId: string,
  apiToken: string
): Promise<TelegramInstanceState> {
  try {
    const response = await fetch(
      `https://wappi.pro/tapi/sync/get/status?profile_id=${profileId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': apiToken
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Wappi.pro status check error:', errorText);
      return {
        status: 'error',
        error: `HTTP ${response.status}: ${errorText}`
      };
    }

    const data = await response.json();
    console.log('Wappi.pro status response:', data);

    // Wappi.pro returns { status: true/false, ... }
    if (data.status === true) {
      return {
        status: 'authorized',
        phone: data.phone,
        username: data.username
      };
    } else {
      return {
        status: 'not_authorized',
        error: data.message || 'Profile not authorized'
      };
    }
  } catch (error) {
    console.error('Error checking Telegram instance state:', error);
    return {
      status: 'error',
      error: error.message || 'Failed to check status'
    };
  }
}

async function setupWebhook(
  profileId: string,
  webhookUrl: string,
  apiToken: string
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const response = await fetch(
      `https://wappi.pro/tapi/webhook/url/set?profile_id=${profileId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': apiToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          webhook_url: webhookUrl
        })
      }
    );

    const data = await response.json();
    console.log('Webhook setup response:', data);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${JSON.stringify(data)}`
      };
    }

    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('Error setting up webhook:', error);
    return {
      success: false,
      error: error.message || 'Failed to setup webhook'
    };
  }
}
