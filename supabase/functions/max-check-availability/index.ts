import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import {
  corsHeaders,
  handleCors,
  getErrorMessage,
  type MaxSettings,
  type MaxCheckAvailabilityRequest,
  type MaxCheckAvailabilityResponse,
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

    const body: MaxCheckAvailabilityRequest = await req.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: 'phoneNumber is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number
    const cleanPhone = phoneNumber.replace(/[^\d]/g, '');

    console.log(`Checking MAX availability for: ${cleanPhone}`);

    // Call Green API v3 checkWhatsapp
    const apiUrl = `${GREEN_API_URL}/v3/waInstance${instanceId}/checkWhatsapp/${apiToken}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: parseInt(cleanPhone) })
    });

    const responseText = await response.text();
    console.log('Green API checkWhatsapp response:', responseText);

    // Check for non-200 response or HTML error response
    if (!response.ok || responseText.includes('<html')) {
      console.log('Green API returned error or HTML, treating as unavailable');
      const unavailableResponse: MaxCheckAvailabilityResponse = {
        success: true,
        existsWhatsapp: false,
        chatId: null,
        unavailable: true,
        reason: 'API temporarily unavailable'
      };
      return new Response(
        JSON.stringify(unavailableResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result: { existsWhatsapp?: boolean; chatId?: string };
    try {
      result = JSON.parse(responseText);
    } catch {
      // Return graceful response instead of 500
      const parseErrorResponse: MaxCheckAvailabilityResponse = {
        success: true,
        existsWhatsapp: false,
        chatId: null,
        unavailable: true
      };
      return new Response(
        JSON.stringify(parseErrorResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const successResponse: MaxCheckAvailabilityResponse = {
      success: true,
      existsWhatsapp: result.existsWhatsapp ?? false,
      chatId: result.chatId ?? null
    };

    return new Response(
      JSON.stringify(successResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in max-check-availability:', error);
    return new Response(
      JSON.stringify({ error: getErrorMessage(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
