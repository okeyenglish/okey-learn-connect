import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import {
  corsHeaders,
  handleCors,
  getErrorMessage,
  type MessengerSettings,
  type TelegramSettings,
} from "../_shared/types.ts";

interface BulkFetchRequest {
  clientIds: string[];
}

interface BulkFetchResponse {
  success: boolean;
  processed: number;
  updated: number;
  errors: string[];
}

interface ClientRecord {
  id: string;
  whatsapp_chat_id?: string | null;
  whatsapp_id?: string | null;
  phone?: string | null;
  telegram_chat_id?: string | null;
  telegram_user_id?: string | null;
  max_chat_id?: string | null;
  whatsapp_avatar_url?: string | null;
  telegram_avatar_url?: string | null;
  max_avatar_url?: string | null;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
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
        JSON.stringify({ success: false, error: 'Organization not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organizationId = profile.organization_id;

    const body: BulkFetchRequest = await req.json();
    const { clientIds } = body;

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, updated: 0, errors: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit to 20 clients per request to avoid timeout
    const limitedIds = clientIds.slice(0, 20);

    // Get clients without avatars
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, whatsapp_chat_id, whatsapp_id, phone, telegram_chat_id, telegram_user_id, max_chat_id, whatsapp_avatar_url, telegram_avatar_url, max_avatar_url')
      .eq('organization_id', organizationId)
      .in('id', limitedIds);

    if (clientsError || !clients) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch clients' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter to only clients without any avatar
    const clientsWithoutAvatars = clients.filter((c: ClientRecord) => 
      !c.whatsapp_avatar_url && !c.telegram_avatar_url && !c.max_avatar_url
    );

    if (clientsWithoutAvatars.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, updated: 0, errors: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get messenger settings
    const { data: whatsappSettings } = await supabase
      .from('messenger_settings')
      .select('settings, provider')
      .eq('organization_id', organizationId)
      .eq('messenger_type', 'whatsapp')
      .eq('is_enabled', true)
      .maybeSingle();

    const { data: telegramSettings } = await supabase
      .from('messenger_settings')
      .select('settings')
      .eq('organization_id', organizationId)
      .eq('messenger_type', 'telegram')
      .eq('is_enabled', true)
      .maybeSingle();

    // Background task to fetch avatars
    const backgroundTask = async () => {
      let updated = 0;
      const errors: string[] = [];

      for (const client of clientsWithoutAvatars as ClientRecord[]) {
        try {
          let avatarUrl: string | null = null;
          let avatarField: string | null = null;

          // Try WhatsApp first
          if (!avatarUrl && whatsappSettings && (client.whatsapp_chat_id || client.whatsapp_id || client.phone)) {
            const waResult = await fetchWhatsAppAvatar(
              client,
              whatsappSettings.settings as MessengerSettings,
              whatsappSettings.provider as string | undefined
            );
            if (waResult) {
              avatarUrl = waResult;
              avatarField = 'whatsapp_avatar_url';
            }
          }

          // Try Telegram
          if (!avatarUrl && telegramSettings && (client.telegram_chat_id || client.telegram_user_id)) {
            const tgResult = await fetchTelegramAvatar(
              client,
              telegramSettings.settings as TelegramSettings
            );
            if (tgResult) {
              avatarUrl = tgResult;
              avatarField = 'telegram_avatar_url';
            }
          }

          // Update client if avatar found
          if (avatarUrl && avatarField) {
            await supabase
              .from('clients')
              .update({ 
                [avatarField]: avatarUrl,
                avatar_url: avatarUrl // Also set main avatar
              })
              .eq('id', client.id);
            
            updated++;
            console.log(`[BulkAvatar] Updated avatar for client ${client.id}`);
          }
        } catch (err) {
          errors.push(`Client ${client.id}: ${getErrorMessage(err)}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log(`[BulkAvatar] Completed: ${updated} updated, ${errors.length} errors`);
    };

    // Start background task
    EdgeRuntime.waitUntil(backgroundTask());

    // Return immediate response
    const response: BulkFetchResponse = {
      success: true,
      processed: clientsWithoutAvatars.length,
      updated: 0, // Will be updated in background
      errors: [],
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in bulk-fetch-avatars:', error);
    return new Response(
      JSON.stringify({ success: false, error: getErrorMessage(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchWhatsAppAvatar(
  client: ClientRecord,
  settings: MessengerSettings,
  provider?: string
): Promise<string | null> {
  try {
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

    if (!instanceId || !apiToken) return null;

    // Determine chat ID
    let chatId = client.whatsapp_chat_id;
    if (!chatId && client.whatsapp_id) {
      chatId = client.whatsapp_id.includes('@') ? client.whatsapp_id : `${client.whatsapp_id}@c.us`;
    }
    if (!chatId && client.phone) {
      const cleanPhone = client.phone.replace(/[^\d]/g, '');
      chatId = `${cleanPhone}@c.us`;
    }

    if (!chatId) return null;

    const response = await fetch(`${apiUrl}/waInstance${instanceId}/getAvatar/${apiToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId })
    });

    if (!response.ok) return null;

    const result = await response.json();
    return result.urlAvatar || null;
  } catch {
    return null;
  }
}

async function fetchTelegramAvatar(
  client: ClientRecord,
  settings: TelegramSettings
): Promise<string | null> {
  try {
    const { profileId, apiToken } = settings;
    if (!profileId || !apiToken) return null;

    const chatId = client.telegram_chat_id || client.telegram_user_id?.toString();
    if (!chatId) return null;

    const response = await fetch(
      `https://wappi.pro/tapi/sync/contact/get?profile_id=${profileId}&chat_id=${chatId}`,
      {
        method: 'GET',
        headers: { 'Authorization': apiToken }
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data.photo_url || data.avatar_url || null;
  } catch {
    return null;
  }
}
