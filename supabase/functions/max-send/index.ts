import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendMessageRequest {
  clientId: string;
  channelId: string;
  text: string;
  attachments?: any[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const maxConnectorUrl = Deno.env.get('MAX_CONNECTOR_URL');
    const maxSecret = Deno.env.get('MAX_CONNECTOR_SECRET');

    if (!maxConnectorUrl) {
      return new Response(
        JSON.stringify({ error: 'MAX_CONNECTOR_URL not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: SendMessageRequest = await req.json();
    const { clientId, channelId, text, attachments } = body;

    if (!clientId || !channelId || !text) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: clientId, channelId, text' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sending MAX message:', { clientId, channelId, textLength: text.length });

    // Get client to find max_chat_id
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, max_chat_id, organization_id')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      console.error('Client not found:', clientError);
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!client.max_chat_id) {
      return new Response(
        JSON.stringify({ error: 'Client has no MAX chat ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify channel exists and belongs to same organization
    const { data: channel, error: channelError } = await supabase
      .from('max_channels')
      .select('id, organization_id, status')
      .eq('id', channelId)
      .single();

    if (channelError || !channel) {
      console.error('Channel not found:', channelError);
      return new Response(
        JSON.stringify({ error: 'Channel not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (channel.organization_id !== client.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Channel and client organization mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save outgoing message with pending status
    const { data: savedMessage, error: saveError } = await supabase
      .from('chat_messages')
      .insert({
        client_id: clientId,
        organization_id: client.organization_id,
        message_text: text,
        message_type: attachments?.length ? 'media' : 'text',
        messenger_type: 'max',
        max_channel_id: channelId,
        is_outgoing: true,
        is_read: true,
        message_status: 'pending'
      })
      .select('id')
      .single();

    if (saveError) {
      console.error('Error saving message:', saveError);
      return new Response(
        JSON.stringify({ error: 'Failed to save message' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send message via MAX Connector
    try {
      const connectorResponse = await fetch(`${maxConnectorUrl}/channels/${channelId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-max-secret': maxSecret || ''
        },
        body: JSON.stringify({
          chatId: client.max_chat_id,
          text,
          attachments,
          messageId: savedMessage.id
        })
      });

      const connectorResult = await connectorResponse.json();

      if (!connectorResponse.ok) {
        // Update message status to failed
        await supabase
          .from('chat_messages')
          .update({ message_status: 'failed' })
          .eq('id', savedMessage.id);

        console.error('MAX Connector error:', connectorResult);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to send message via MAX',
            details: connectorResult 
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update message with external ID and sent status
      await supabase
        .from('chat_messages')
        .update({ 
          message_status: 'sent',
          external_message_id: connectorResult.maxMessageId
        })
        .eq('id', savedMessage.id);

      console.log('Message sent successfully:', savedMessage.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          messageId: savedMessage.id,
          maxMessageId: connectorResult.maxMessageId
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (connectorError) {
      console.error('Connector request failed:', connectorError);
      
      // Update message status to failed
      await supabase
        .from('chat_messages')
        .update({ message_status: 'failed' })
        .eq('id', savedMessage.id);

      return new Response(
        JSON.stringify({ 
          error: 'MAX Connector unavailable',
          messageId: savedMessage.id 
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('MAX send error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});