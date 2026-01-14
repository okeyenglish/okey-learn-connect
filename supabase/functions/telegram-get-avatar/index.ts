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
      .select('settings')
      .eq('organization_id', organizationId)
      .eq('messenger_type', 'telegram')
      .maybeSingle();

    if (settingsError || !settings?.settings?.profileId) {
      return new Response(
        JSON.stringify({ error: 'Telegram not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const profileId = settings.settings.profileId;

    const body = await req.json();
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
        return new Response(
          JSON.stringify({ error: 'Client not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      chatId = client.telegram_chat_id || client.telegram_user_id?.toString();
    }

    if (!chatId) {
      return new Response(
        JSON.stringify({ error: 'Chat ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get avatar from Wappi.pro
    const avatarResult = await getAvatar(profileId, chatId, wappiApiToken);

    if (!avatarResult.success) {
      return new Response(
        JSON.stringify({ error: avatarResult.error || 'Failed to get avatar' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update client avatar if clientId provided
    if (clientId && avatarResult.avatarUrl) {
      const updateData: any = {
        telegram_avatar_url: avatarResult.avatarUrl
      };

      // Also update main avatar_url if it's empty
      const { data: clientData } = await supabase
        .from('clients')
        .select('avatar_url')
        .eq('id', clientId)
        .single();

      if (!clientData?.avatar_url) {
        updateData.avatar_url = avatarResult.avatarUrl;
      }

      await supabase
        .from('clients')
        .update(updateData)
        .eq('id', clientId);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        avatarUrl: avatarResult.avatarUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Telegram get avatar error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
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

    const data = await response.json();
    console.log('Wappi.pro get contact response:', data);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}`
      };
    }

    return {
      success: true,
      avatarUrl: data.photo_url || data.avatar_url || null
    };
  } catch (error) {
    console.error('Error getting avatar:', error);
    return {
      success: false,
      error: error.message || 'Failed to get avatar'
    };
  }
}
