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

    // Get client with phone number
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('telegram_chat_id, telegram_user_id, phone, name')
      .eq('id', clientId)
      .eq('organization_id', organizationId)
      .single();

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try telegram_chat_id first, then telegram_user_id, then phone number
    let recipient = client.telegram_chat_id || client.telegram_user_id?.toString();
    let usePhoneNumber = false;
    
    // If no Telegram ID, use phone number with recipient field
    if (!recipient && client.phone) {
      const cleanPhone = client.phone.replace(/\D/g, '');
      if (cleanPhone) {
        recipient = cleanPhone;
        usePhoneNumber = true;
        console.log('Using phone number as recipient:', recipient);
      }
    }
    
    if (!recipient) {
      return new Response(
        JSON.stringify({ 
          error: 'У клиента нет Telegram и номера телефона',
          code: 'NO_TELEGRAM_CONTACT'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Sending Telegram message to:', recipient, 'usePhoneNumber:', usePhoneNumber);

    // Send message via Wappi.pro
    let sendResult;
    if (fileUrl) {
      sendResult = await sendFileMessage(profileId, recipient, fileUrl, text || '', wappiApiToken, usePhoneNumber);
    } else if (text) {
      sendResult = await sendTextMessage(profileId, recipient, text, wappiApiToken, usePhoneNumber);
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

    // Save message to database - message_type is 'manager' for outgoing messages
    const contentType = fileUrl ? getMessageTypeFromFile(fileType) : 'text';
    
    const { data: savedMessage, error: saveError } = await supabase
      .from('chat_messages')
      .insert({
        client_id: clientId,
        organization_id: organizationId,
        message_text: text || (fileUrl ? '[Файл]' : ''),
        message_type: 'manager', // outgoing message from manager
        messenger_type: 'telegram',
        is_outgoing: true,
        is_read: true,
        external_message_id: sendResult.messageId,
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileType || contentType, // store content type
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
  recipient: string,
  text: string,
  apiToken: string,
  usePhoneNumber: boolean = false
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const url = `https://wappi.pro/tapi/sync/message/send?profile_id=${profileId}`;

  // Wappi.pro payload keys are not consistently documented; we try multiple variants.
  const recipientVariants: Array<string | number> = /^\d+$/.test(recipient)
    ? [recipient, Number(recipient)]
    : [recipient];

  const bodies: Record<string, unknown>[] = usePhoneNumber
    ? [{ recipient, body: text }]
    : [
        ...recipientVariants.map((r) => ({ chatId: r, body: text })),
        ...recipientVariants.map((r) => ({ chat_id: r, body: text })),
        ...recipientVariants.map((r) => ({ to: r, body: text })),
        ...recipientVariants.map((r) => ({ recipient: r, body: text })),
      ];

  return await sendWithFallback(url, apiToken, bodies, 'text');
}

async function sendFileMessage(
  profileId: string,
  recipient: string,
  fileUrl: string,
  caption: string,
  apiToken: string,
  usePhoneNumber: boolean = false
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const url = `https://wappi.pro/tapi/sync/message/file/url/send?profile_id=${profileId}`;

  const base = {
    url: fileUrl,
    caption: caption || undefined,
  };

  // Wappi.pro payload keys are not consistently documented; we try multiple variants.
  const recipientVariants: Array<string | number> = /^\d+$/.test(recipient)
    ? [recipient, Number(recipient)]
    : [recipient];

  const bodies: Record<string, unknown>[] = usePhoneNumber
    ? [{ recipient, ...base }]
    : [
        ...recipientVariants.map((r) => ({ chatId: r, ...base })),
        ...recipientVariants.map((r) => ({ chat_id: r, ...base })),
        ...recipientVariants.map((r) => ({ to: r, ...base })),
        ...recipientVariants.map((r) => ({ recipient: r, ...base })),
      ];

  return await sendWithFallback(url, apiToken, bodies, 'file');
}

type WappiApiResponse = {
  status?: string;
  detail?: string;
  message?: string;
  message_id?: string;
  id?: string;
};

async function sendWithFallback(
  url: string,
  apiToken: string,
  bodies: Record<string, unknown>[],
  kind: 'text' | 'file'
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const attemptErrors: string[] = [];

  for (let i = 0; i < bodies.length; i++) {
    const body = bodies[i];
    console.log(`[telegram-send] ${kind} attempt #${i + 1}/${bodies.length}:`, body);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: apiToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      let data: WappiApiResponse | null = null;
      try {
        data = await response.json();
      } catch {
        const text = await response.text().catch(() => '');
        data = { detail: text || `HTTP ${response.status}` };
      }

      console.log(`[telegram-send] ${kind} response #${i + 1}:`, data);

      if (response.ok && data?.status !== 'error') {
        return {
          success: true,
          messageId: data?.message_id || data?.id,
        };
      }

      attemptErrors.push(
        `attempt #${i + 1}: http=${response.status} body=${JSON.stringify(body)} response=${JSON.stringify(data)}`
      );

      // If Wappi explicitly says recipient is wrong, there is a good chance the key name is wrong.
      // Continue trying fallbacks.
      continue;
    } catch (err) {
      console.error(`[telegram-send] ${kind} attempt #${i + 1} failed:`, err);
      attemptErrors.push(`attempt #${i + 1}: ${err?.message || String(err)}`);
      continue;
    }
  }

  const last = attemptErrors[attemptErrors.length - 1] || 'Unknown error';
  return {
    success: false,
    error: last,
  };
}

function getMessageTypeFromFile(fileType: string | undefined): string {
  if (!fileType) return 'document';
  
  if (fileType.startsWith('image/')) return 'image';
  if (fileType.startsWith('video/')) return 'video';
  if (fileType.startsWith('audio/')) return 'audio';
  
  return 'document';
}
