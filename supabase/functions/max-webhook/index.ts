import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-max-secret',
};

interface MaxMessageEvent {
  tenantId?: string;
  channelId: string;
  eventType: string;
  chatId: string;
  userId: number;
  messageId: string;
  text?: string;
  attachments?: any[];
  timestamp: string;
  senderName?: string;
  raw?: any;
}

interface RoutingRule {
  id: string;
  name: string;
  channel_type: string;
  channel_id: string | null;
  priority: number;
  conditions: {
    keywords?: string[];
    time_range?: { start: string; end: string };
    tags?: string[];
  };
  actions: {
    assign_to?: string;
    queue?: string;
    auto_reply?: string;
    create_lead?: boolean;
  };
  is_enabled: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const maxSecret = Deno.env.get('MAX_CONNECTOR_SECRET');

    // Validate secret from MAX Connector
    const requestSecret = req.headers.get('x-max-secret');
    if (maxSecret && requestSecret !== maxSecret) {
      console.error('Invalid MAX secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const event: MaxMessageEvent = await req.json();

    console.log('Received MAX webhook event:', JSON.stringify(event, null, 2));

    if (!event.channelId || !event.chatId || !event.userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: channelId, chatId, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get channel info to determine organization
    const { data: channel, error: channelError } = await supabase
      .from('max_channels')
      .select('id, organization_id, name')
      .eq('id', event.channelId)
      .single();

    if (channelError || !channel) {
      console.error('Channel not found:', event.channelId, channelError);
      return new Response(
        JSON.stringify({ error: 'Channel not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert client by max_user_id
    let client;
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id, name')
      .eq('max_user_id', event.userId)
      .eq('organization_id', channel.organization_id)
      .single();

    if (existingClient) {
      client = existingClient;
      // Update max_chat_id if needed
      await supabase
        .from('clients')
        .update({ 
          max_chat_id: event.chatId,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingClient.id);
    } else {
      // Create new client
      const clientName = event.senderName || `MAX User ${event.userId}`;
      const { data: newClient, error: createError } = await supabase
        .from('clients')
        .insert({
          organization_id: channel.organization_id,
          name: clientName,
          max_user_id: event.userId,
          max_chat_id: event.chatId,
          is_active: true,
          last_message_at: new Date().toISOString()
        })
        .select('id, name')
        .single();

      if (createError) {
        console.error('Error creating client:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create client' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      client = newClient;
      console.log('Created new client:', client);
    }

    // Save incoming message
    const messageData = {
      client_id: client.id,
      organization_id: channel.organization_id,
      message_text: event.text || '[Медиа сообщение]',
      message_type: event.attachments?.length ? 'media' : 'text',
      messenger_type: 'max',
      max_channel_id: channel.id,
      external_message_id: event.messageId,
      is_outgoing: false,
      is_read: false,
      message_status: 'delivered',
      created_at: event.timestamp || new Date().toISOString()
    };

    const { data: savedMessage, error: messageError } = await supabase
      .from('chat_messages')
      .insert(messageData)
      .select('id')
      .single();

    if (messageError) {
      console.error('Error saving message:', messageError);
      return new Response(
        JSON.stringify({ error: 'Failed to save message' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Saved message:', savedMessage.id);

    // Update channel message counter
    await supabase.rpc('increment_max_channel_messages', { 
      channel_id: channel.id 
    }).catch(() => {
      // Fallback if RPC doesn't exist
      supabase
        .from('max_channels')
        .update({ messages_today: supabase.rpc('coalesce', { value: 'messages_today', default: 0 }) })
        .eq('id', channel.id);
    });

    // Apply routing rules
    const { data: rules } = await supabase
      .from('routing_rules')
      .select('*')
      .eq('organization_id', channel.organization_id)
      .eq('is_enabled', true)
      .or(`channel_type.eq.max,channel_type.eq.all`)
      .order('priority', { ascending: false });

    let autoReplyText: string | null = null;
    let assignedTo: string | null = null;

    if (rules && rules.length > 0) {
      for (const rule of rules as RoutingRule[]) {
        // Check if rule applies to this channel
        if (rule.channel_id && rule.channel_id !== channel.id) {
          continue;
        }

        // Check keyword conditions
        if (rule.conditions.keywords && rule.conditions.keywords.length > 0) {
          const messageText = (event.text || '').toLowerCase();
          const matches = rule.conditions.keywords.some(kw => 
            messageText.includes(kw.toLowerCase())
          );
          if (!matches) continue;
        }

        // Check time range
        if (rule.conditions.time_range) {
          const now = new Date();
          const hours = now.getHours();
          const minutes = now.getMinutes();
          const currentTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          
          const { start, end } = rule.conditions.time_range;
          if (currentTime < start || currentTime > end) {
            continue;
          }
        }

        // Apply actions
        if (rule.actions.assign_to) {
          assignedTo = rule.actions.assign_to;
        }

        if (rule.actions.auto_reply) {
          autoReplyText = rule.actions.auto_reply;
        }

        // First matching rule wins
        break;
      }
    }

    // Send auto-reply if configured
    if (autoReplyText) {
      const connectorUrl = Deno.env.get('MAX_CONNECTOR_URL');
      if (connectorUrl) {
        try {
          const sendResponse = await fetch(`${connectorUrl}/channels/${channel.id}/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-max-secret': maxSecret || ''
            },
            body: JSON.stringify({
              chatId: event.chatId,
              text: autoReplyText
            })
          });

          if (sendResponse.ok) {
            // Save auto-reply message
            await supabase
              .from('chat_messages')
              .insert({
                client_id: client.id,
                organization_id: channel.organization_id,
                message_text: autoReplyText,
                message_type: 'text',
                messenger_type: 'max',
                max_channel_id: channel.id,
                is_outgoing: true,
                is_read: true,
                message_status: 'sent',
                system_type: 'auto_reply'
              });
            console.log('Auto-reply sent successfully');
          }
        } catch (e) {
          console.error('Failed to send auto-reply:', e);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: savedMessage.id,
        clientId: client.id,
        autoReplySent: !!autoReplyText,
        assignedTo
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('MAX webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});