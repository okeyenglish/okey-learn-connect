import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple XOR encryption with base64 encoding
function encrypt(text: string, key: string): string {
  const textBytes = new TextEncoder().encode(text);
  const keyBytes = new TextEncoder().encode(key);
  const encrypted = new Uint8Array(textBytes.length);
  
  for (let i = 0; i < textBytes.length; i++) {
    encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  
  // Add timestamp for expiration (5 minutes validity)
  const timestamp = Date.now();
  const payload = JSON.stringify({ data: btoa(String.fromCharCode(...encrypted)), ts: timestamp });
  const payloadBytes = new TextEncoder().encode(payload);
  const encryptedPayload = new Uint8Array(payloadBytes.length);
  
  for (let i = 0; i < payloadBytes.length; i++) {
    encryptedPayload[i] = payloadBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  
  return btoa(String.fromCharCode(...encryptedPayload));
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const encryptionKey = Deno.env.get("SSO_ENCRYPTION_KEY");
    if (!encryptionKey) {
      console.error("SSO_ENCRYPTION_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Encryption not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await supabase.auth.getUser();
    if (claimsError || !claimsData?.user) {
      console.error("Auth error:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { access_token, refresh_token } = await req.json();

    if (!access_token || !refresh_token) {
      return new Response(
        JSON.stringify({ error: "Missing tokens" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Encrypt tokens together
    const tokensPayload = JSON.stringify({ access_token, refresh_token });
    const encryptedPayload = encrypt(tokensPayload, encryptionKey);

    console.log("SSO tokens encrypted successfully for user:", claimsData.user.id);

    return new Response(
      JSON.stringify({ encrypted: encryptedPayload }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("SSO encrypt error:", error);
    return new Response(
      JSON.stringify({ error: "Encryption failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
