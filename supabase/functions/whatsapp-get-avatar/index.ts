import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import {
  corsHeaders,
  handleCors,
  getErrorMessage,
  type GetAvatarRequest,
  type GetAvatarResponse,
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

    const userId = claimsData.claims.sub as string;

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

    let body: GetAvatarRequest = { clientId: '' };
    try {
      body = await req.json();
    } catch {
      body = { clientId: '' };
    }

    const { chatId, clientId } = body as GetAvatarRequest & { chatId?: string };

    // Get chatId from clientId if not provided
    let targetChatId = chatId;
    if (!targetChatId && clientId) {
      const { data: client } = await supabase
        .from('clients')
        .select('whatsapp_chat_id, phone')
        .eq('id', clientId)
        .maybeSingle();

      if (client?.whatsapp_chat_id) {
        targetChatId = client.whatsapp_chat_id as string;
      } else if (client?.phone) {
        const cleanPhone = (client.phone as string).replace(/[^\d]/g, '');
        targetChatId = `${cleanPhone}@c.us`;
      }
    }

    if (!targetChatId) {
      // Return empty result instead of error - client may not have WhatsApp
      const emptyResponse: GetAvatarResponse = {
        success: true,
        urlAvatar: undefined,
        available: false
      };
      return new Response(
        JSON.stringify(emptyResponse),
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

    let result: { urlAvatar?: string; available?: boolean };
    try {
      result = JSON.parse(responseText);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid API response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const successResponse: GetAvatarResponse = {
      success: true,
      urlAvatar: result.urlAvatar,
      available: result.available !== false
    };

    return new Response(
      JSON.stringify(successResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in whatsapp-get-avatar:', error);
    return new Response(
      JSON.stringify({ error: getErrorMessage(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
