import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Green API base URL for MAX (v3)
const DEFAULT_GREEN_API_URL = 'https://api.green-api.com';
const GREEN_API_URL =
  Deno.env.get('MAX_GREEN_API_URL') ||
  Deno.env.get('GREEN_API_URL') ||
  DEFAULT_GREEN_API_URL;

interface EditMessageRequest {
  messageId: string;
  newMessage: string;
  clientId: string;
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

    // Get MAX settings from messenger_settings
    const { data: messengerSettings, error: settingsError } = await supabase
      .from('messenger_settings')
      .select('settings')
      .eq('organization_id', organizationId)
      .eq('messenger_type', 'max')
      .eq('is_enabled', true)
      .single();

    if (settingsError || !messengerSettings) {
      console.error('MAX settings not found:', settingsError);
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

    // Parse request body
    const body: EditMessageRequest = await req.json();
    const { messageId, newMessage, clientId } = body;

    if (!messageId || !newMessage) {
      return new Response(
        JSON.stringify({ error: 'messageId and newMessage are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get message info from database
    const { data: messageData, error: fetchError } = await supabase
      .from('chat_messages')
      .select('external_message_id, client_id, messenger_type')
      .eq('id', messageId)
      .single();

    if (fetchError || !messageData) {
      console.error('Error fetching message:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Message not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify this is a MAX message
    if (messageData.messenger_type !== 'max') {
      return new Response(
        JSON.stringify({ success: false, error: 'This is not a MAX message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client info for chatId
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, max_chat_id, max_user_id, phone')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      console.error('Client not found:', clientError);
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine chatId for MAX
    let chatId = client.max_chat_id;
    if (!chatId && client.max_user_id) {
      chatId = String(client.max_user_id);
    }
    if (!chatId && client.phone) {
      const cleanPhone = client.phone.replace(/[^\d]/g, '');
      chatId = `${cleanPhone}@c.us`;
    }

    if (!chatId) {
      return new Response(
        JSON.stringify({ error: 'Client has no MAX chat ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no external_message_id, update only locally
    if (!messageData.external_message_id) {
      console.log('No external_message_id, updating only in database');
      const { error: updateError } = await supabase
        .from('chat_messages')
        .update({ message_text: newMessage })
        .eq('id', messageId);

      if (updateError) {
        console.error('Error updating message in database:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update message in database' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, messageId: messageId, localOnly: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Editing MAX message: chatId=${chatId}, idMessage=${messageData.external_message_id}`);

    // Call Green API v3 editMessage
    const apiUrl = `${GREEN_API_URL}/v3/waInstance${instanceId}/editMessage/${apiToken}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId,
        idMessage: messageData.external_message_id,
        message: newMessage
      })
    });

    const responseText = await response.text();
    console.log('Green API edit response:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      // If edit fails via API, update only locally
      console.log('Edit API failed, updating only in database');
      const { error: updateError } = await supabase
        .from('chat_messages')
        .update({ message_text: newMessage })
        .eq('id', messageId);

      if (updateError) {
        console.error('Error updating message in database:', updateError);
      }

      return new Response(
        JSON.stringify({ success: true, messageId: messageId, localOnly: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (response.ok && result.idMessage) {
      // Update message in database
      const { error: updateError } = await supabase
        .from('chat_messages')
        .update({ 
          message_text: newMessage,
          external_message_id: result.idMessage
        })
        .eq('id', messageId);

      if (updateError) {
        console.error('Error updating message in database:', updateError);
      }

      return new Response(
        JSON.stringify({ success: true, messageId: result.idMessage }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // If API returns error, still update locally
      console.log('Edit API returned error, updating only in database:', result);
      const { error: updateError } = await supabase
        .from('chat_messages')
        .update({ message_text: newMessage })
        .eq('id', messageId);

      if (updateError) {
        console.error('Error updating message in database:', updateError);
      }

      return new Response(
        JSON.stringify({ success: true, messageId: messageId, localOnly: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in max-edit:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
