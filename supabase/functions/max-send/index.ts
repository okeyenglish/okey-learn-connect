import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Green API base URL for MAX (v3 instance - uses 3100 subdomain)
const GREEN_API_URL = 'https://3100.api.green-api.com';

interface SendMessageRequest {
  clientId: string;
  text: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
}

interface MaxSettings {
  instanceId: string;
  apiToken: string;
  webhookUrl?: string;
}

serve(async (req) => {
  // Handle CORS preflight
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
    const body: SendMessageRequest = await req.json();
    const { clientId, text, fileUrl, fileName, fileType } = body;

    if (!clientId || (!text && !fileUrl)) {
      return new Response(
        JSON.stringify({ error: 'clientId and text or fileUrl are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client info
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, max_chat_id, max_user_id, phone')
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
    // MAX uses numeric chatId format: "10000000" for individual, "-10000000000000" for groups
    // Or phone format: "79991234567@c.us"
    let chatId = client.max_chat_id;
    
    if (!chatId && client.max_user_id) {
      chatId = String(client.max_user_id);
    }
    
    if (!chatId && client.phone) {
      // Format phone for MAX: remove + and spaces, add @c.us
      const cleanPhone = client.phone.replace(/[^\d]/g, '');
      chatId = `${cleanPhone}@c.us`;
    }

    if (!chatId) {
      return new Response(
        JSON.stringify({ error: 'Client has no MAX chat ID or phone number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending MAX message to chatId: ${chatId}, text length: ${text?.length || 0}`);

    let greenApiResponse;
    let messageId: string;

    if (fileUrl) {
      // Send file via sendFileByUrl
      const apiUrl = `${GREEN_API_URL}/v3/waInstance${instanceId}/sendFileByUrl/${apiToken}`;
      
      const fileBody = {
        chatId,
        urlFile: fileUrl,
        fileName: fileName || 'file',
        caption: text || ''
      };

      console.log('Sending file to MAX:', apiUrl, fileBody);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fileBody)
      });

      const responseText = await response.text();
      console.log('Green API file response text:', responseText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText.substring(0, 200)}`);
      }

      try {
        greenApiResponse = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
      }

      messageId = greenApiResponse.idMessage;
    } else {
      // Send text message
      const apiUrl = `${GREEN_API_URL}/v3/waInstance${instanceId}/sendMessage/${apiToken}`;
      
      const messageBody = {
        chatId,
        message: text
      };

      console.log('Sending message to MAX:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageBody)
      });

      const responseText = await response.text();
      console.log('Green API message response text:', responseText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText.substring(0, 200)}`);
      }

      try {
        greenApiResponse = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
      }

      messageId = greenApiResponse.idMessage;
    }

    // Save message to database
    const { data: savedMessage, error: saveError } = await supabase
      .from('chat_messages')
      .insert({
        client_id: clientId,
        organization_id: organizationId,
        message_text: text || `[Файл: ${fileName || 'file'}]`,
        message_type: 'manager',
        messenger_type: 'max',
        is_outgoing: true,
        is_read: true,
        external_message_id: messageId,
        file_url: fileUrl || null,
        file_name: fileName || null,
        file_type: fileType || null,
        message_status: 'sent'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving message:', saveError);
    }

    // Update client's last_message_at
    await supabase
      .from('clients')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', clientId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId,
        savedMessageId: savedMessage?.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in max-send:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
