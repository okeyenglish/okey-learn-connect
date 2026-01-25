import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import {
  corsHeaders,
  handleCors,
  errorResponse,
  getErrorMessage,
  type TelegramGetAvatarRequest,
  type TelegramGetAvatarResponse,
  type TelegramSettings,
  type WappiContactResponse,
} from '../_shared/types.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Authorization header required', 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    // Get organization ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      return errorResponse('Organization not found', 404);
    }

    const organizationId = profile.organization_id;

    // Get Telegram settings from messenger_settings (per-organization)
    const { data: messengerSettings, error: settingsError } = await supabase
      .from('messenger_settings')
      .select('settings')
      .eq('organization_id', organizationId)
      .eq('messenger_type', 'telegram')
      .maybeSingle();

    if (settingsError) {
      console.error('Error fetching Telegram settings:', settingsError);
      return errorResponse('Failed to fetch Telegram settings', 500);
    }

    const settings = messengerSettings?.settings as TelegramSettings | null;
    const profileId = settings?.profileId;
    const wappiApiToken = settings?.apiToken;

    if (!profileId || !wappiApiToken) {
      return errorResponse('Telegram not configured', 400);
    }

    const body = await req.json() as TelegramGetAvatarRequest;
    const { clientId, chatId: providedChatId } = body;

    let chatId = providedChatId;

    // If clientId provided, get chatId from client
    if (clientId && !chatId) {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('telegram_chat_id, telegram_user_id')
        .eq('id', clientId)
        .eq('organization_id', organizationId)
        .single();

      if (clientError || !client) {
        return errorResponse('Client not found', 404);
      }

      chatId = client.telegram_chat_id || client.telegram_user_id?.toString();
    }

    if (!chatId) {
      return errorResponse('Chat ID is required', 400);
    }

    // Get avatar from Wappi.pro
    const avatarResult = await getAvatar(profileId, chatId, wappiApiToken);

    if (!avatarResult.success) {
      return errorResponse(avatarResult.error || 'Failed to get avatar', 500);
    }

    // Update client avatar if clientId provided
    if (clientId && avatarResult.avatarUrl) {
      const updateData: Record<string, string> = {
        telegram_avatar_url: avatarResult.avatarUrl
      };

      // Also update main avatar_url if it's empty
      const { data: clientData } = await supabase
        .from('clients')
        .select('avatar_url')
        .eq('id', clientId)
        .maybeSingle();

      if (!clientData?.avatar_url) {
        updateData.avatar_url = avatarResult.avatarUrl;
      }

      await supabase
        .from('clients')
        .update(updateData)
        .eq('id', clientId);
    }

    const response: TelegramGetAvatarResponse = { 
      success: true, 
      avatarUrl: avatarResult.avatarUrl
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Telegram get avatar error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});

async function getAvatar(
  profileId: string,
  chatId: string,
  apiToken: string
): Promise<{ success: boolean; avatarUrl?: string; error?: string }> {
  try {
    // Wappi.pro API for getting user avatar
    const response = await fetch(
      `https://wappi.pro/tapi/sync/contact/get?profile_id=${profileId}&chat_id=${chatId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': apiToken
        }
      }
    );

    const data = await response.json() as WappiContactResponse;
    console.log('Wappi.pro get contact response:', data);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}`
      };
    }

    return {
      success: true,
      avatarUrl: data.photo_url || data.avatar_url || undefined
    };
  } catch (error: unknown) {
    console.error('Error getting avatar:', error);
    return {
      success: false,
      error: getErrorMessage(error)
    };
  }
}
