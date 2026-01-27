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
    // Validate authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[push-subscription-save] Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabaseAuth.auth.getUser(token);
    
    if (claimsError || !claims?.user) {
      console.error("[push-subscription-save] Invalid token:", claimsError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authenticatedUserId = claims.user.id;

    // Parse request body
    const body: SaveRequest = await req.json();
    const { user_id, endpoint, keys, user_agent } = body;

    // Validate required fields
    if (!user_id || !endpoint || !keys?.p256dh || !keys?.auth) {
      console.error("[push-subscription-save] Missing required fields:", { user_id: !!user_id, endpoint: !!endpoint, keys: !!keys });
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, endpoint, keys.p256dh, keys.auth" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure user can only save their own subscription
    if (user_id !== authenticatedUserId) {
      console.error("[push-subscription-save] User ID mismatch:", { provided: user_id, authenticated: authenticatedUserId });
      return new Response(
        JSON.stringify({ error: "Cannot save subscription for another user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for database operations
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

    console.log("[push-subscription-save] Successfully saved subscription for user:", user_id);

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
