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

    // Use environment variables for greenapi or settings
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

    const body = await req.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: 'phoneNumber is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number
    const cleanPhone = phoneNumber.replace(/[^\d]/g, '');

    console.log(`Checking WhatsApp availability for: ${cleanPhone}`);

    // Call Green API checkWhatsapp
    const checkUrl = `${apiUrl}/waInstance${instanceId}/checkWhatsapp/${apiToken}`;
    
    const response = await fetch(checkUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: parseInt(cleanPhone) })
    });

    const responseText = await response.text();
    console.log('Green API checkWhatsapp response:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid API response', raw: responseText.substring(0, 200) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        existsWhatsapp: result.existsWhatsapp,
        chatId: result.chatId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in whatsapp-check-availability:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
