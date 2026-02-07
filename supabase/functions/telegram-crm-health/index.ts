import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_CRM_API_URL = "https://tg.academyos.ru";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[telegram-crm-health] Checking server health...");

    const response = await fetch(`${TELEGRAM_CRM_API_URL}/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      // Response might not be JSON
    }

    console.log(`[telegram-crm-health] Status: ${response.status}`);

    return new Response(
      JSON.stringify({
        success: response.ok,
        status: response.status,
        data,
        url: TELEGRAM_CRM_API_URL,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[telegram-crm-health] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Connection failed",
        url: TELEGRAM_CRM_API_URL,
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
