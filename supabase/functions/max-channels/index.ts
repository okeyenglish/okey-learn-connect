import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GREEN_API_URL = 'https://api.green-api.com';

interface MaxSettings {
  instanceId: string;
  apiToken: string;
  webhookUrl?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
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

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organizationId = profile.organization_id;

    // Route based on method
    switch (req.method) {
      case 'GET':
        return await getMaxSettings(supabase, organizationId);
      
      case 'POST':
        return await saveMaxSettings(supabase, organizationId, await req.json());
      
      case 'DELETE':
        return await deleteMaxSettings(supabase, organizationId);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Error in max-channels:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getMaxSettings(supabase: any, organizationId: string) {
  const { data, error } = await supabase
    .from('messenger_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('messenger_type', 'max')
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    console.error('Error fetching MAX settings:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch settings' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get instance state if configured
  let instanceState = null;
  if (data?.settings?.instanceId && data?.settings?.apiToken) {
    instanceState = await checkInstanceState(
      data.settings.instanceId,
      data.settings.apiToken
    );
  }

  return new Response(
    JSON.stringify({ 
      settings: data || null,
      instanceState 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function saveMaxSettings(supabase: any, organizationId: string, body: any) {
  const { instanceId, apiToken, isEnabled = true } = body;

  if (!instanceId || !apiToken) {
    return new Response(
      JSON.stringify({ error: 'instanceId and apiToken are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validate credentials by checking instance state
  const instanceState = await checkInstanceState(instanceId, apiToken);
  
  if (!instanceState.success) {
    return new Response(
      JSON.stringify({ 
        error: 'Invalid credentials or instance not available',
        details: instanceState.error 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Generate webhook URL
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const webhookUrl = `${supabaseUrl}/functions/v1/max-webhook`;

  const settings: MaxSettings = {
    instanceId,
    apiToken,
    webhookUrl
  };

  // Upsert messenger settings
  const { data, error } = await supabase
    .from('messenger_settings')
    .upsert({
      organization_id: organizationId,
      messenger_type: 'max',
      is_enabled: isEnabled,
      settings,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'organization_id,messenger_type'
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving MAX settings:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to save settings' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Try to set webhook URL in Green API
  const webhookSetup = await setupWebhook(instanceId, apiToken, webhookUrl);

  return new Response(
    JSON.stringify({ 
      success: true,
      settings: data,
      instanceState,
      webhookSetup
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function deleteMaxSettings(supabase: any, organizationId: string) {
  const { error } = await supabase
    .from('messenger_settings')
    .delete()
    .eq('organization_id', organizationId)
    .eq('messenger_type', 'max');

  if (error) {
    console.error('Error deleting MAX settings:', error);
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

async function checkInstanceState(instanceId: string, apiToken: string): Promise<any> {
  try {
    const url = `${GREEN_API_URL}/v3/waInstance${instanceId}/getStateInstance/${apiToken}`;
    console.log('Checking MAX instance state:', url);
    
    const response = await fetch(url);
    
    // Check if response is ok first
    if (!response.ok) {
      const text = await response.text();
      console.error('Instance state error response:', response.status, text);
      return { 
        success: false, 
        error: `HTTP ${response.status}: ${text || 'No response body'}` 
      };
    }
    
    // Try to parse JSON, handle empty response
    const text = await response.text();
    if (!text || text.trim() === '') {
      console.error('Empty response from Green API');
      return { 
        success: false, 
        error: 'Empty response from Green API - check instance ID and token' 
      };
    }
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse response:', text);
      return { 
        success: false, 
        error: `Invalid JSON response: ${text.substring(0, 100)}` 
      };
    }
    
    console.log('Instance state response:', data);

    return {
      success: true,
      stateInstance: data.stateInstance,
      statusInstance: data.statusInstance
    };
  } catch (error) {
    console.error('Error checking instance state:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

async function setupWebhook(instanceId: string, apiToken: string, webhookUrl: string): Promise<any> {
  try {
    const url = `${GREEN_API_URL}/v3/waInstance${instanceId}/setSettings/${apiToken}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhookUrl,
        webhookUrlToken: '',
        delaySendMessagesMilliseconds: 1000,
        markIncomingMessagesReaded: 'no',
        markIncomingMessagesReadedOnReply: 'no',
        outgoingWebhook: 'yes',
        outgoingMessageWebhook: 'yes',
        outgoingAPIMessageWebhook: 'no',
        incomingWebhook: 'yes',
        stateWebhook: 'yes',
        pollMessageWebhook: 'no',
        incomingCallWebhook: 'no'
      })
    });

    const data = await response.json();
    console.log('Webhook setup response:', data);

    return {
      success: response.ok,
      data
    };
  } catch (error) {
    console.error('Error setting up webhook:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
