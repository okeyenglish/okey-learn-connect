import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_CRM_API_URL = "https://tg.academyos.ru";

type ProfileAction = "list" | "create" | "start" | "stop" | "delete";

interface ProfileRequest {
  action: ProfileAction;
  phone?: string;
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
    const { action, phone }: ProfileRequest = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: "Действие обязательно" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[telegram-crm-profiles] Action: ${action}, Phone: ${phone || "N/A"}`);

    let response: Response;

    switch (action) {
      case "list":
        // GET /profiles
        response = await fetch(`${TELEGRAM_CRM_API_URL}/profiles`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        break;

      case "create":
        if (!phone) {
          return new Response(
            JSON.stringify({ success: false, error: "Номер телефона обязателен" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // POST /profiles?phone=
        const cleanedPhone = phone.replace(/\D/g, "");
        response = await fetch(`${TELEGRAM_CRM_API_URL}/profiles?phone=${cleanedPhone}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        break;

      case "start":
        if (!phone) {
          return new Response(
            JSON.stringify({ success: false, error: "Номер телефона обязателен" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // POST /profiles/{phone}/start
        response = await fetch(`${TELEGRAM_CRM_API_URL}/profiles/${phone.replace(/\D/g, "")}/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        break;

      case "stop":
        if (!phone) {
          return new Response(
            JSON.stringify({ success: false, error: "Номер телефона обязателен" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // POST /profiles/{phone}/stop
        response = await fetch(`${TELEGRAM_CRM_API_URL}/profiles/${phone.replace(/\D/g, "")}/stop`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        break;

      case "delete":
        if (!phone) {
          return new Response(
            JSON.stringify({ success: false, error: "Номер телефона обязателен" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // DELETE /profiles/{phone}
        response = await fetch(`${TELEGRAM_CRM_API_URL}/profiles/${phone.replace(/\D/g, "")}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });
        break;

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Неизвестное действие: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Process response
    let data = null;
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      try {
        data = await response.json();
      } catch {
        // Ignore parse errors
      }
    }

    console.log(`[telegram-crm-profiles] Response status: ${response.status}`);

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
        data,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[telegram-crm-profiles] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Внутренняя ошибка сервера",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
