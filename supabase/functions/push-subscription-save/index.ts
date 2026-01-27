import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SaveRequest {
  user_id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  user_agent?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check for API key (anon key) - basic authorization check
    // Note: We don't validate JWT because users authenticate via self-hosted Supabase
    // which has a different JWT secret. The user_id comes from the client after
    // successful self-hosted authentication.
    const apiKey = req.headers.get("apikey");
    const expectedAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!apiKey || apiKey !== expectedAnonKey) {
      console.error("[push-subscription-save] Invalid or missing API key");
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: SaveRequest = await req.json();
    const { user_id, endpoint, keys, user_agent } = body;

    // Validate required fields
    if (!user_id || !endpoint || !keys?.p256dh || !keys?.auth) {
      console.error("[push-subscription-save] Missing required fields:", { 
        user_id: !!user_id, 
        endpoint: !!endpoint, 
        keys: !!keys 
      });
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, endpoint, keys.p256dh, keys.auth" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate user_id format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(user_id)) {
      console.error("[push-subscription-save] Invalid user_id format:", user_id);
      return new Response(
        JSON.stringify({ error: "Invalid user_id format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for database operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[push-subscription-save] Saving subscription for user:", user_id);

    // Delete old subscriptions for this user (only keep one active subscription per user)
    const { error: deleteError } = await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user_id);

    if (deleteError) {
      console.warn("[push-subscription-save] Error deleting old subscriptions:", deleteError.message);
      // Continue anyway - upsert will handle it
    }

    // Upsert the new subscription
    const { error: upsertError } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(
        {
          user_id,
          endpoint,
          keys,
          user_agent: user_agent || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,endpoint" }
      );

    if (upsertError) {
      console.error("[push-subscription-save] Error upserting subscription:", upsertError);
      return new Response(
        JSON.stringify({ error: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[push-subscription-save] ✅ Successfully saved subscription for user:", user_id);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[push-subscription-save] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
