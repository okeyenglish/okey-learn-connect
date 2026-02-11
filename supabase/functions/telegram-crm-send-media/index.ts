import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_CRM_API_URL = 'https://tg.academyos.ru';

type MediaType = 'photo' | 'video' | 'voice' | 'file';

interface SendMediaRequest {
  clientId: string;
  mediaType: MediaType;
  fileUrl?: string;
  fileData?: string; // Base64
  fileName?: string;
  integrationId?: string;
}

interface TelegramCrmSettings {
  crmApiUrl: string;
  crmPhoneNumber: string;
  secret?: string;
}

const MEDIA_ENDPOINTS: Record<MediaType, string> = {
  photo: '/telegram/send_photo',
  video: '/telegram/send_video',
  voice: '/telegram/send_voice',
  file: '/telegram/send_file',
};

Deno.serve(async (req) => {
  console.log('[telegram-crm-send-media] Request received');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const selfHostedUrl = Deno.env.get('SELF_HOSTED_URL') || 'https://api.academyos.ru';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(selfHostedUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organizationId = profile.organization_id;

    // Parse request
    const body: SendMediaRequest = await req.json();
    const { clientId, mediaType, fileUrl, fileData, fileName, integrationId } = body;

    if (!clientId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Client ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!mediaType || !MEDIA_ENDPOINTS[mediaType]) {
      return new Response(
        JSON.stringify({ success: false, error: 'Valid media type required (photo, video, voice, file)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!fileUrl && !fileData) {
      return new Response(
        JSON.stringify({ success: false, error: 'File URL or file data required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get integration settings
    let integration;
    
    if (integrationId) {
      const { data, error } = await supabase
        .from('messenger_integrations')
        .select('settings, is_enabled')
        .eq('id', integrationId)
        .eq('organization_id', organizationId)
        .eq('provider', 'telegram_crm')
        .single();
      
      if (error || !data) {
        return new Response(
          JSON.stringify({ success: false, error: 'Integration not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      integration = data;
    } else {
      // Get primary telegram_crm integration
      const { data, error } = await supabase
        .from('messenger_integrations')
        .select('settings, is_enabled')
        .eq('organization_id', organizationId)
        .eq('messenger_type', 'telegram')
        .eq('provider', 'telegram_crm')
        .eq('is_primary', true)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ success: false, error: 'No Telegram CRM integration configured' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      integration = data;
    }

    if (!integration.is_enabled) {
      return new Response(
        JSON.stringify({ success: false, error: 'Telegram CRM integration is disabled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const settings = integration.settings as TelegramCrmSettings;
    const { crmPhoneNumber, secret } = settings;

    if (!crmPhoneNumber) {
      return new Response(
        JSON.stringify({ success: false, error: 'Telegram CRM settings incomplete' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client info
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('telegram_user_id, phone, name')
      .eq('id', clientId)
      .eq('organization_id', organizationId)
      .single();

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ success: false, error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine recipient
    const recipient = client.telegram_user_id || client.phone;
    
    if (!recipient) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'У клиента нет Telegram контакта',
          code: 'NO_TELEGRAM_CONTACT'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[telegram-crm-send-media] Sending to:', recipient, 'type:', mediaType);

    // Download file if URL provided
    let fileBlob: Blob;
    let finalFileName = fileName || 'file';

    if (fileUrl) {
      console.log('[telegram-crm-send-media] Downloading file from:', fileUrl);
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to download file' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      fileBlob = await fileResponse.blob();
      
      // Extract filename from URL if not provided
      if (!fileName) {
        const urlPath = new URL(fileUrl).pathname;
        finalFileName = urlPath.split('/').pop() || 'file';
      }
    } else if (fileData) {
      // Decode base64
      console.log('[telegram-crm-send-media] Decoding base64 data');
      const binaryString = atob(fileData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      fileBlob = new Blob([bytes]);
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'No file data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build multipart form data
    const formData = new FormData();
    formData.append('phone', crmPhoneNumber);
    formData.append('to', recipient);
    formData.append('file', fileBlob, finalFileName);

    // Prepare headers
    const headers: Record<string, string> = {};
    if (secret) {
      headers['X-Lovable-Secret'] = secret;
    }

    // Send to Telegram CRM
    const endpoint = `${TELEGRAM_CRM_API_URL}${MEDIA_ENDPOINTS[mediaType]}`;
    console.log('[telegram-crm-send-media] Sending to endpoint:', endpoint);

    const apiResponse = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: formData,
    });

    let responseData: { status?: string; message_id?: string; error?: string } = {};
    try {
      responseData = await apiResponse.json();
    } catch {
      const responseText = await apiResponse.text().catch(() => '');
      responseData = { error: responseText || `HTTP ${apiResponse.status}` };
    }

    console.log('[telegram-crm-send-media] API response:', responseData);

    if (!apiResponse.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: responseData.error || `HTTP ${apiResponse.status}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save message to database
    const messageText = `[${mediaType === 'photo' ? 'Фото' : mediaType === 'video' ? 'Видео' : mediaType === 'voice' ? 'Голосовое' : 'Файл'}]`;
    
    const { data: savedMessage, error: saveError } = await supabase
      .from('chat_messages')
      .insert({
        client_id: clientId,
        organization_id: organizationId,
        message_text: messageText,
        message_type: 'manager',
        messenger_type: 'telegram',
        message_status: 'sent',
        is_outgoing: true,
        is_read: true,
        external_message_id: responseData.message_id,
        file_url: fileUrl,
        file_name: finalFileName,
        file_type: mediaType,
      })
      .select('id')
      .single();

    if (saveError) {
      console.error('[telegram-crm-send-media] Error saving message:', saveError);
    }

    // Update client's last_message_at
    await supabase
      .from('clients')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', clientId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: responseData.message_id,
        savedMessageId: savedMessage?.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[telegram-crm-send-media] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
