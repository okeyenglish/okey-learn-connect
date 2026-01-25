import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import {
  corsHeaders,
  handleCors,
  getErrorMessage,
  type MaxSettings,
  type MaxGetContactInfoRequest,
  type MaxGetContactInfoResponse,
} from "../_shared/types.ts";

const DEFAULT_GREEN_API_URL = 'https://api.green-api.com';
const GREEN_API_URL =
  Deno.env.get('MAX_GREEN_API_URL') ||
  Deno.env.get('GREEN_API_URL') ||
  DEFAULT_GREEN_API_URL;

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

    const body: MaxGetContactInfoRequest = await req.json();
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
        chatId = client.max_chat_id as string | undefined;
        if (!chatId && client.max_user_id) {
          chatId = String(client.max_user_id);
        }
        if (!chatId && client.phone) {
          const cleanPhone = (client.phone as string).replace(/[^\d]/g, '');
          chatId = `${cleanPhone}@c.us`;
        }
      }
    }

    if (!chatId) {
      return new Response(
        JSON.stringify({ error: 'Could not determine chatId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Getting MAX contact info for: ${chatId}`);

    // Call Green API v3 getContactInfo
    const apiUrl = `${GREEN_API_URL}/v3/waInstance${instanceId}/getContactInfo/${apiToken}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId })
    });

    const responseText = await response.text();
    console.log('Green API getContactInfo response:', responseText);

    let result: Record<string, unknown>;
    try {
      result = JSON.parse(responseText);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid API response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const successResponse: MaxGetContactInfoResponse = {
      success: true,
      name: result.name as string | undefined,
      phone: result.phone as string | undefined,
      email: result.email as string | undefined,
      about: result.about as string | undefined,
      ...result
    };

    return new Response(
      JSON.stringify(successResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in max-get-contact-info:', error);
    return new Response(
      JSON.stringify({ error: getErrorMessage(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
