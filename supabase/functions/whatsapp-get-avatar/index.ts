import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate JWT using getClaims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.log('JWT validation failed:', claimsError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (!profile?.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get WhatsApp settings
    const { data: messengerSettings } = await supabase
      .from('messenger_settings')
      .select('settings, provider')
      .eq('organization_id', profile.organization_id)
      .eq('messenger_type', 'whatsapp')
      .eq('is_enabled', true)
      .single();

    if (!messengerSettings) {
      return new Response(
        JSON.stringify({ error: 'WhatsApp integration not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const settings = messengerSettings.settings as any;
    const provider = messengerSettings.provider;

    let instanceId: string;
    let apiToken: string;
    let apiUrl: string;

    if (provider === 'greenapi') {
      instanceId = Deno.env.get('GREEN_API_ID_INSTANCE') || settings?.instanceId;
      apiToken = Deno.env.get('GREEN_API_TOKEN_INSTANCE') || settings?.apiToken;
      apiUrl = Deno.env.get('GREEN_API_URL') || settings?.apiUrl || 'https://api.green-api.com';
    } else {
      instanceId = settings?.instanceId;
      apiToken = settings?.apiToken;
      apiUrl = settings?.apiUrl || 'https://api.green-api.com';
    }

    if (!instanceId || !apiToken) {
      return new Response(
        JSON.stringify({ error: 'WhatsApp credentials not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch (_e) {
      body = {};
    }

    const { chatId, clientId } = body;

    // Get chatId from clientId if not provided
    let targetChatId = chatId;
    if (!targetChatId && clientId) {
      const { data: client } = await supabase
        .from('clients')
        .select('whatsapp_chat_id, phone')
        .eq('id', clientId)
        .single();

      if (client?.whatsapp_chat_id) {
        targetChatId = client.whatsapp_chat_id;
      } else if (client?.phone) {
        const cleanPhone = client.phone.replace(/[^\d]/g, '');
        targetChatId = `${cleanPhone}@c.us`;
      }
    }

    if (!targetChatId) {
      // Return empty result instead of error - client may not have WhatsApp
      return new Response(
        JSON.stringify({ success: true, urlAvatar: null, available: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Getting WhatsApp avatar for: ${targetChatId}`);

    // Call Green API getAvatar
    const avatarUrl = `${apiUrl}/waInstance${instanceId}/getAvatar/${apiToken}`;
    
    const response = await fetch(avatarUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: targetChatId })
    });

    const responseText = await response.text();
    console.log('Green API getAvatar response:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid API response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        urlAvatar: result.urlAvatar,
        available: result.available !== false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in whatsapp-get-avatar:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
