import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_GREEN_API_URL = 'https://api.green-api.com';
const GREEN_API_URL =
  Deno.env.get('MAX_GREEN_API_URL') ||
  Deno.env.get('GREEN_API_URL') ||
  DEFAULT_GREEN_API_URL;

interface GetAvatarRequest {
  clientId?: string;
  chatId?: string;
}

interface MaxSettings {
  instanceId: string;
  apiToken: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    const { data: messengerSettings } = await supabase
      .from('messenger_settings')
      .select('settings')
      .eq('organization_id', profile.organization_id)
      .eq('messenger_type', 'max')
      .eq('is_enabled', true)
      .single();

    if (!messengerSettings) {
      return new Response(
        JSON.stringify({ error: 'MAX integration not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const maxSettings = messengerSettings.settings as MaxSettings;
    if (!maxSettings?.instanceId || !maxSettings?.apiToken) {
      return new Response(
        JSON.stringify({ error: 'MAX credentials not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { instanceId, apiToken } = maxSettings;

    const body: GetAvatarRequest = await req.json();
    let { clientId, chatId } = body;

    if (!clientId && !chatId) {
      return new Response(
        JSON.stringify({ error: 'clientId or chatId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If clientId provided, get chatId from client
    if (clientId && !chatId) {
      const { data: client } = await supabase
        .from('clients')
        .select('max_chat_id, max_user_id, phone')
        .eq('id', clientId)
        .single();

      if (client) {
        chatId = client.max_chat_id;
        if (!chatId && client.max_user_id) {
          chatId = String(client.max_user_id);
        }
        if (!chatId && client.phone) {
          const cleanPhone = client.phone.replace(/[^\d]/g, '');
          chatId = `${cleanPhone}@c.us`;
        }
      }
    }

    if (!chatId) {
      // Return graceful response instead of error
      return new Response(
        JSON.stringify({ 
          success: true,
          urlAvatar: null,
          available: false,
          reason: 'No chatId available'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Getting MAX avatar for: ${chatId}`);

    // Call Green API v3 getAvatar
    const apiUrl = `${GREEN_API_URL}/v3/waInstance${instanceId}/getAvatar/${apiToken}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId })
    });

    const responseText = await response.text();
    console.log('Green API getAvatar response:', responseText);

    // Check for non-200 response or HTML error response
    if (!response.ok || responseText.includes('<html')) {
      console.log('Green API returned error or HTML, treating as unavailable');
      return new Response(
        JSON.stringify({ 
          success: true,
          urlAvatar: null,
          available: false,
          reason: 'API temporarily unavailable'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      return new Response(
        JSON.stringify({ 
          success: true,
          urlAvatar: null,
          available: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update client avatar if clientId provided and avatar exists
    if (clientId && result.urlAvatar) {
      await supabase
        .from('clients')
        .update({ 
          max_avatar_url: result.urlAvatar,
          // Also update main avatar if not set
          avatar_url: result.urlAvatar
        })
        .eq('id', clientId)
        .is('avatar_url', null); // Only update main avatar if it's null
      
      // Always update max_avatar_url regardless
      await supabase
        .from('clients')
        .update({ max_avatar_url: result.urlAvatar })
        .eq('id', clientId);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        urlAvatar: result.urlAvatar,
        available: result.available
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in max-get-avatar:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
