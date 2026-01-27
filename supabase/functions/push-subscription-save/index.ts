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
    // Auth strategy (self-hosted frontend compatibility):
    // - Accept anon key via `apikey` header OR `Authorization: Bearer <anon>`
    // - Also accept a VALID JWT issued by this backend (useful for internal tooling)
    // - Do NOT accept/validate JWTs from self-hosted instances (different signing keys)
    const apiKeyHeader = req.headers.get("apikey")?.trim();
    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

    const expectedAnonKey =
      (Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY"))?.trim();

    if (!expectedAnonKey) {
      console.error("[push-subscription-save] Missing backend anon key env (SUPABASE_ANON_KEY/SUPABASE_PUBLISHABLE_KEY)");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isAnonKeyAuth =
      apiKeyHeader === expectedAnonKey || bearerToken === expectedAnonKey;

    // Debug: always log summary (redacted) for troubleshooting cross-env auth
    const redact = (v: string | null | undefined) =>
      v ? `${v.slice(0, 20)}…(len:${v.length})` : null;
    console.log("[push-subscription-save] Auth check", {
      isAnonKeyAuth,
      apiKeyHeader: redact(apiKeyHeader),
      bearerToken: redact(bearerToken),
      expectedAnonKey: redact(expectedAnonKey),
    });

    let isValidBackendJwt = false;
    if (!isAnonKeyAuth) {
      const tokensToValidate = [bearerToken, apiKeyHeader].filter(
        (t): t is string => !!t
      );

      if (tokensToValidate.length) {
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

          // Validate token claims against THIS backend's signing keys.
          // Using service key here avoids relying on env anon key equality.
          const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);

          for (const token of tokensToValidate) {
            const { data, error } = await supabaseAuth.auth.getClaims(token);
            if (!error && data?.claims) {
              isValidBackendJwt = true;
              break;
            }
          }
        } catch (_e) {
          isValidBackendJwt = false;
        }
      }
    }

    if (!isAnonKeyAuth && !isValidBackendJwt) {
      const redact = (v: string | null | undefined) =>
        v ? `${v.slice(0, 12)}…(len:${v.length})` : null;

      console.error("[push-subscription-save] Unauthorized: missing/invalid anon key or backend JWT", {
        hasApiKeyHeader: !!apiKeyHeader,
        hasAuthorization: !!authHeader,
        apiKeyHeader: redact(apiKeyHeader),
        bearerToken: redact(bearerToken),
        expectedAnonKey: redact(expectedAnonKey),
      });
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
