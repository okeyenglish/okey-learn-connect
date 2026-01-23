import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

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

    // Get contact info from Wappi.pro
    const contactResult = await getContactInfo(profileId, chatId, wappiApiToken);

    if (!contactResult.success) {
      return new Response(
        JSON.stringify({ error: contactResult.error || 'Failed to get contact info' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update client info if clientId provided
    if (clientId && contactResult.contactInfo) {
      const updateData: any = {};

      if (contactResult.contactInfo.avatarUrl) {
        updateData.telegram_avatar_url = contactResult.contactInfo.avatarUrl;
        
        // Also update main avatar_url if it's empty
        const { data: clientData } = await supabase
          .from('clients')
          .select('avatar_url')
          .eq('id', clientId)
          .single();

        if (!clientData?.avatar_url) {
          updateData.avatar_url = contactResult.contactInfo.avatarUrl;
        }
      }

      if (contactResult.contactInfo.username) {
        updateData.notes = `@${contactResult.contactInfo.username}`;
      }

      if (Object.keys(updateData).length > 0) {
        await supabase
          .from('clients')
          .update(updateData)
          .eq('id', clientId);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        contactInfo: contactResult.contactInfo
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Telegram get contact info error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

interface ContactInfo {
  id?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
}

async function getContactInfo(
  profileId: string,
  chatId: string,
  apiToken: string
): Promise<{ success: boolean; contactInfo?: ContactInfo; error?: string }> {
  try {
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
    console.log('Wappi.pro get contact info response:', data);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}`
      };
    }

    const contactInfo: ContactInfo = {
      id: data.id?.toString(),
      firstName: data.first_name,
      lastName: data.last_name,
      username: data.username,
      phone: data.phone,
      avatarUrl: data.photo_url || data.avatar_url,
      bio: data.bio
    };

    return {
      success: true,
      contactInfo
    };
  } catch (error) {
    console.error('Error getting contact info:', error);
    return {
      success: false,
      error: error.message || 'Failed to get contact info'
    };
  }
}
