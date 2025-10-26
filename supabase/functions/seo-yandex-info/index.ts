import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const YANDEX_OAUTH_TOKEN = Deno.env.get('YANDEX_OAUTH_TOKEN');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!YANDEX_OAUTH_TOKEN) {
      throw new Error('YANDEX_OAUTH_TOKEN not configured');
    }

    // Get user ID
    const userResponse = await fetch('https://api.webmaster.yandex.net/v4/user/', {
      headers: {
        'Authorization': `OAuth ${YANDEX_OAUTH_TOKEN}`,
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      throw new Error(`Failed to get user info: ${errorText}`);
    }

    const userData = await userResponse.json();
    const userId = userData.user_id;

    // Get hosts
    const hostsResponse = await fetch(
      `https://api.webmaster.yandex.net/v4/user/${userId}/hosts`,
      {
        headers: {
          'Authorization': `OAuth ${YANDEX_OAUTH_TOKEN}`,
        },
      }
    );

    if (!hostsResponse.ok) {
      const errorText = await hostsResponse.text();
      throw new Error(`Failed to get hosts: ${errorText}`);
    }

    const hostsData = await hostsResponse.json();

    return new Response(JSON.stringify({
      success: true,
      userId,
      hosts: hostsData.hosts || [],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[seo-yandex-info] Error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
