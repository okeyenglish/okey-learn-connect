import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GREEN_API_URL = 'https://3100.api.green-api.com';

interface DeleteMessageRequest {
  messageId: string;
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

    const organizationId = profile.organization_id;

    const { data: messengerSettings } = await supabase
      .from('messenger_settings')
      .select('settings')
      .eq('organization_id', organizationId)
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

    const body: DeleteMessageRequest = await req.json();
    const { messageId, clientId } = body;

    if (!messageId) {
      return new Response(
        JSON.stringify({ error: 'messageId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get message info
    const { data: messageData, error: fetchError } = await supabase
      .from('chat_messages')
      .select('external_message_id, client_id, messenger_type')
      .eq('id', messageId)
      .single();

    if (fetchError || !messageData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Message not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client info
    const { data: client } = await supabase
      .from('clients')
      .select('max_chat_id, max_user_id, phone')
      .eq('id', clientId)
      .single();

    if (!client) {
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let chatId = client.max_chat_id;
    if (!chatId && client.max_user_id) {
      chatId = String(client.max_user_id);
    }
    if (!chatId && client.phone) {
      const cleanPhone = client.phone.replace(/[^\d]/g, '');
      chatId = `${cleanPhone}@c.us`;
    }

    // If no external_message_id, just mark as deleted locally
    if (!messageData.external_message_id || !chatId) {
      const { error: updateError } = await supabase
        .from('chat_messages')
        .update({ message_text: '[Сообщение удалено]' })
        .eq('id', messageId);

      if (updateError) {
        console.error('Error updating message:', updateError);
      }

      return new Response(
        JSON.stringify({ success: true, localOnly: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Deleting MAX message: chatId=${chatId}, idMessage=${messageData.external_message_id}`);

    // Call Green API v3 deleteMessage
    const apiUrl = `${GREEN_API_URL}/v3/waInstance${instanceId}/deleteMessage/${apiToken}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId,
        idMessage: messageData.external_message_id
      })
    });

    const responseText = await response.text();
    console.log('Green API delete response:', responseText);

    // Mark message as deleted in database regardless of API result
    const { error: updateError } = await supabase
      .from('chat_messages')
      .update({ message_text: '[Сообщение удалено]' })
      .eq('id', messageId);

    if (updateError) {
      console.error('Error updating message:', updateError);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in max-delete:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
