import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_CRM_API_URL = "https://tg.academyos.ru";

type WebhookAction = "queue" | "dlq";

interface WebhookRequest {
  action: WebhookAction;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Не авторизован" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Не авторизован" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const { action }: WebhookRequest = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: "Действие обязательно (queue или dlq)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[telegram-crm-webhooks] Action: ${action}`);

    let endpoint: string;
    switch (action) {
      case "queue":
        endpoint = `${TELEGRAM_CRM_API_URL}/webhooks/queue`;
        break;
      case "dlq":
        endpoint = `${TELEGRAM_CRM_API_URL}/webhooks/dlq`;
        break;
      default:
        return new Response(
          JSON.stringify({ success: false, error: `Неизвестное действие: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const response = await fetch(endpoint, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    let data = null;
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      try {
        data = await response.json();
      } catch {
        // Ignore parse errors
      }
    }

    console.log(`[telegram-crm-webhooks] Response status: ${response.status}`);

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: data?.detail || data?.error || `HTTP ${response.status}`,
          status: response.status,
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        data,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[telegram-crm-webhooks] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Внутренняя ошибка сервера",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
