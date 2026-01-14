import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const wappiApiToken = Deno.env.get('WAPPI_API_TOKEN');

    if (!wappiApiToken) {
      return new Response(
        JSON.stringify({ error: 'WAPPI_API_TOKEN not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
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

    // Get organization ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organizationId = profile.organization_id;

    // Get Telegram settings
    const { data: settings, error: settingsError } = await supabase
      .from('messenger_settings')
      .select('settings, is_enabled')
      .eq('organization_id', organizationId)
      .eq('messenger_type', 'telegram')
      .maybeSingle();

    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ error: 'Telegram not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!settings.is_enabled) {
      return new Response(
        JSON.stringify({ error: 'Telegram integration is disabled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const profileId = settings.settings?.profileId;
    if (!profileId) {
      return new Response(
        JSON.stringify({ error: 'Profile ID not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { clientId, text, fileUrl, fileName, fileType } = body;

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'Client ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('telegram_chat_id, telegram_user_id, name')
      .eq('id', clientId)
      .eq('organization_id', organizationId)
      .single();

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Telegram requires an existing chat - can't send to phone numbers like WhatsApp
    const chatId = client.telegram_chat_id || client.telegram_user_id?.toString();
    
    if (!chatId) {
      return new Response(
        JSON.stringify({ 
          error: 'У клиента нет Telegram. Отправка возможна только тем, кто уже писал вам в Telegram.',
          code: 'NO_TELEGRAM_CHAT'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Sending Telegram message to chat:', chatId);

    // Send message via Wappi.pro
    let sendResult;
    if (fileUrl) {
      sendResult = await sendFileMessage(profileId, chatId, fileUrl, text || '', wappiApiToken);
    } else if (text) {
      sendResult = await sendTextMessage(profileId, chatId, text, wappiApiToken);
    } else {
      return new Response(
        JSON.stringify({ error: 'Message text or file is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!sendResult.success) {
      return new Response(
        JSON.stringify({ error: sendResult.error || 'Failed to send message' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save message to database
    const messageType = fileUrl ? getMessageTypeFromFile(fileType) : 'text';
    
    const { data: savedMessage, error: saveError } = await supabase
      .from('chat_messages')
      .insert({
        client_id: clientId,
        organization_id: organizationId,
        message_text: text || (fileUrl ? '[Файл]' : ''),
        message_type: messageType,
        messenger_type: 'telegram',
        is_outgoing: true,
        is_read: true,
        external_message_id: sendResult.messageId,
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileType,
        message_status: 'sent'
      })
      .select('id')
      .single();

    if (saveError) {
      console.error('Error saving sent message:', saveError);
    }

    // Update client's last_message_at
    await supabase
      .from('clients')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', clientId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: sendResult.messageId,
        savedMessageId: savedMessage?.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Telegram send error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendTextMessage(
  profileId: string,
  chatId: string,
  text: string,
  apiToken: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch(
      `https://wappi.pro/tapi/sync/message/send?profile_id=${profileId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': apiToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: chatId,
          body: text
        })
      }
    );

    const data = await response.json();
    console.log('Wappi.pro send response:', data);

    if (!response.ok || data.status === false) {
      return {
        success: false,
        error: data.message || `HTTP ${response.status}`
      };
    }

    return {
      success: true,
      messageId: data.message_id || data.id
    };
  } catch (error) {
    console.error('Error sending text message:', error);
    return {
      success: false,
      error: error.message || 'Failed to send message'
    };
  }
}

async function sendFileMessage(
  profileId: string,
  chatId: string,
  fileUrl: string,
  caption: string,
  apiToken: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch(
      `https://wappi.pro/tapi/sync/message/file/url/send?profile_id=${profileId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': apiToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: chatId,
          url: fileUrl,
          caption: caption || undefined
        })
      }
    );

    const data = await response.json();
    console.log('Wappi.pro send file response:', data);

    if (!response.ok || data.status === false) {
      return {
        success: false,
        error: data.message || `HTTP ${response.status}`
      };
    }

    return {
      success: true,
      messageId: data.message_id || data.id
    };
  } catch (error) {
    console.error('Error sending file message:', error);
    return {
      success: false,
      error: error.message || 'Failed to send file'
    };
  }
}

function getMessageTypeFromFile(fileType: string | undefined): string {
  if (!fileType) return 'document';
  
  if (fileType.startsWith('image/')) return 'image';
  if (fileType.startsWith('video/')) return 'video';
  if (fileType.startsWith('audio/')) return 'audio';
  
  return 'document';
}
