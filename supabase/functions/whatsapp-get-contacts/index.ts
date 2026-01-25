import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import {
  corsHeaders,
  handleCors,
  getErrorMessage,
  type GetContactsResponse,
  type Contact,
  type MessengerSettings,
} from "../_shared/types.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

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
      .maybeSingle();

    if (!messengerSettings) {
      return new Response(
        JSON.stringify({ error: 'WhatsApp integration not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const settings = messengerSettings.settings as MessengerSettings;
    const provider = messengerSettings.provider as string | undefined;

    let instanceId: string | undefined;
    let apiToken: string | undefined;
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

    console.log('Getting WhatsApp contacts');

    // Call Green API getContacts
    const contactsUrl = `${apiUrl}/waInstance${instanceId}/getContacts/${apiToken}`;
    
    const response = await fetch(contactsUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const responseText = await response.text();
    console.log('Green API getContacts response length:', responseText.length);

    let result: Contact[];
    try {
      result = JSON.parse(responseText);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid API response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const successResponse: GetContactsResponse = {
      success: true,
      contacts: Array.isArray(result) ? result : []
    };

    return new Response(
      JSON.stringify(successResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in whatsapp-get-contacts:', error);
    return new Response(
      JSON.stringify({ error: getErrorMessage(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
