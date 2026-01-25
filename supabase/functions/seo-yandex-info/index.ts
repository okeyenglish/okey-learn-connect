import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { 
  corsHeaders, 
  successResponse, 
  errorResponse, 
  getErrorMessage,
  handleCors 
} from '../_shared/types.ts';

const YANDEX_OAUTH_TOKEN = Deno.env.get('YANDEX_OAUTH_TOKEN');

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

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

    return successResponse({
      userId,
      hosts: hostsData.hosts || [],
    });

  } catch (error: unknown) {
    console.error('[seo-yandex-info] Error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});
