const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Decrypt XOR encrypted payload
function decrypt(encryptedBase64: string, key: string): { data: string; ts: number } | null {
  try {
    const keyBytes = new TextEncoder().encode(key);
    
    // Decode outer base64
    const encryptedPayloadBytes = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    const decryptedPayloadBytes = new Uint8Array(encryptedPayloadBytes.length);
    
    for (let i = 0; i < encryptedPayloadBytes.length; i++) {
      decryptedPayloadBytes[i] = encryptedPayloadBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    
    const payloadText = new TextDecoder().decode(decryptedPayloadBytes);
    const payload = JSON.parse(payloadText);
    
    // Decode inner data
    const encryptedDataBytes = Uint8Array.from(atob(payload.data), c => c.charCodeAt(0));
    const decryptedDataBytes = new Uint8Array(encryptedDataBytes.length);
    
    for (let i = 0; i < encryptedDataBytes.length; i++) {
      decryptedDataBytes[i] = encryptedDataBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    
    const dataText = new TextDecoder().decode(decryptedDataBytes);
    
    return { data: dataText, ts: payload.ts };
  } catch (error) {
    console.error("Decryption error:", error);
    return null;
  }
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

    const { encrypted } = await req.json();

    if (!encrypted) {
      return new Response(
        JSON.stringify({ error: "Missing encrypted payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const decrypted = decrypt(encrypted, encryptionKey);
    
    if (!decrypted) {
      return new Response(
        JSON.stringify({ error: "Decryption failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check token expiration (5 minutes)
    const TOKEN_VALIDITY_MS = 5 * 60 * 1000;
    const age = Date.now() - decrypted.ts;
    
    if (age > TOKEN_VALIDITY_MS) {
      console.log("SSO token expired, age:", age, "ms");
      return new Response(
        JSON.stringify({ error: "Token expired" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokens = JSON.parse(decrypted.data);
    
    console.log("SSO tokens decrypted successfully, age:", age, "ms");

    return new Response(
      JSON.stringify({ 
        access_token: tokens.access_token, 
        refresh_token: tokens.refresh_token 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("SSO decrypt error:", error);
    return new Response(
      JSON.stringify({ error: "Decryption failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
