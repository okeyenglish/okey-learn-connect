/**
 * Portal Push Config Edge Function (Lovable Cloud)
 * 
 * Returns the VAPID public key for push notifications.
 * Used as fallback when self-hosted is unavailable.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Return public VAPID key for push subscription
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');

    if (!vapidPublicKey) {
      console.error('[portal-push-config] VAPID_PUBLIC_KEY not configured in Lovable Cloud secrets');
      return new Response(
        JSON.stringify({ 
          error: 'VAPID key not configured',
          success: false,
          source: 'lovable-cloud'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[portal-push-config] Returning VAPID key from Lovable Cloud');

    return new Response(
      JSON.stringify({
        success: true,
        vapidPublicKey,
        source: 'lovable-cloud'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[portal-push-config] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal error',
        success: false,
        source: 'lovable-cloud'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
