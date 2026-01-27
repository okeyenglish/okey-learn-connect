import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteRequest {
  user_id: string;
  endpoint?: string; // If not provided, deletes all subscriptions for the user
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
      console.error("[push-subscription-delete] Missing or invalid Authorization header");
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
      console.error("[push-subscription-delete] Invalid token:", claimsError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authenticatedUserId = claims.user.id;

    // Parse request body
    const body: DeleteRequest = await req.json();
    const { user_id, endpoint } = body;

    // Validate required fields
    if (!user_id) {
      console.error("[push-subscription-delete] Missing user_id");
      return new Response(
        JSON.stringify({ error: "Missing required field: user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure user can only delete their own subscriptions
    if (user_id !== authenticatedUserId) {
      console.error("[push-subscription-delete] User ID mismatch:", { provided: user_id, authenticated: authenticatedUserId });
      return new Response(
        JSON.stringify({ error: "Cannot delete subscription for another user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[push-subscription-delete] Deleting subscription(s) for user:", user_id, endpoint ? `endpoint: ${endpoint.slice(0, 50)}...` : "(all)");

    // Build the delete query
    let query = supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user_id);

    // If endpoint is provided, only delete that specific subscription
    if (endpoint) {
      query = query.eq("endpoint", endpoint);
    }

    const { error: deleteError, count } = await query.select("*", { count: "exact", head: true });

    // Actually execute the delete
    const { error: actualDeleteError } = await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user_id)
      .match(endpoint ? { endpoint } : {});

    if (actualDeleteError) {
      console.error("[push-subscription-delete] Error deleting subscription:", actualDeleteError);
      return new Response(
        JSON.stringify({ error: actualDeleteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[push-subscription-delete] Successfully deleted subscription(s) for user:", user_id);

    return new Response(
      JSON.stringify({ success: true, deleted: count || 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[push-subscription-delete] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
