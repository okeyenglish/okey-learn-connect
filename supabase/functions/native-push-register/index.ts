import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegisterRequest {
  user_id: string;
  device_token?: string;
  subscription_type?: 'fcm' | 'apns';
  user_agent?: string;
  action?: 'register' | 'unregister';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] Native Push Register request received`);

  try {
    // Get authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error(`[${requestId}] Missing authorization header`);
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Validate JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error(`[${requestId}] Auth error:`, authError?.message || "No user");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: RegisterRequest = await req.json();
    const { user_id, device_token, subscription_type, user_agent, action } = body;

    console.log(`[${requestId}] Request:`, {
      user_id,
      device_token: device_token ? `${device_token.substring(0, 20)}...` : null,
      subscription_type,
      action: action || 'register',
    });

    // Validate user_id matches authenticated user
    if (user_id !== user.id) {
      console.error(`[${requestId}] User ID mismatch: ${user_id} vs ${user.id}`);
      return new Response(
        JSON.stringify({ error: "User ID mismatch" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle unregister action
    if (action === 'unregister') {
      console.log(`[${requestId}] Unregistering native push for user: ${user_id}`);
      
      const { error: deleteError } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user_id)
        .in("subscription_type", ['fcm', 'apns']);

      if (deleteError) {
        console.error(`[${requestId}] Error deleting subscriptions:`, deleteError);
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[${requestId}] ✅ Native push unregistered for user: ${user_id}`);
      return new Response(
        JSON.stringify({ success: true, action: 'unregistered' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate required fields for registration
    if (!device_token || !subscription_type) {
      console.error(`[${requestId}] Missing required fields`);
      return new Response(
        JSON.stringify({ error: "Missing device_token or subscription_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate subscription_type
    if (!['fcm', 'apns'].includes(subscription_type)) {
      console.error(`[${requestId}] Invalid subscription_type: ${subscription_type}`);
      return new Response(
        JSON.stringify({ error: "Invalid subscription_type. Must be 'fcm' or 'apns'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete old native subscriptions for this user (keep only one active per user)
    const { error: deleteError } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user_id)
      .in("subscription_type", ['fcm', 'apns']);

    if (deleteError) {
      console.warn(`[${requestId}] Error deleting old subscriptions:`, deleteError.message);
      // Continue anyway
    }

    // Insert new subscription
    // For native push, we use device_token instead of endpoint+keys
    // We'll store the token in the device_token column and use a placeholder endpoint
    const { error: insertError } = await supabase
      .from("push_subscriptions")
      .insert({
        user_id,
        endpoint: `native://${subscription_type}/${device_token.substring(0, 50)}`,
        keys: { device_token }, // Store full token in keys JSON
        device_token,
        subscription_type,
        user_agent: user_agent || null,
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error(`[${requestId}] Error inserting subscription:`, insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] ✅ Native push registered for user: ${user_id}, type: ${subscription_type}`);

    return new Response(
      JSON.stringify({ success: true, subscription_type }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
