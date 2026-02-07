import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Get organization_id from profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Организация не найдена" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const organizationId = profile.organization_id;

    // Parse request
    const { phone, code, phone_hash, name } = await req.json();

    if (!phone || !code) {
      return new Response(
        JSON.stringify({ success: false, error: "Номер телефона и код обязательны" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean phone number
    const cleanedPhone = phone.replace(/\D/g, "");

    console.log(`[telegram-crm-verify-code] Verifying code for: ${cleanedPhone.slice(0, 4)}***`);

    // Step 1: Verify code with Telegram CRM
    const verifyResponse = await fetch(`${TELEGRAM_CRM_API_URL}/telegram/confirm_code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: cleanedPhone,
        code,
        phone_hash: phone_hash || "",
      }),
    });

    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();
      console.error(`[telegram-crm-verify-code] Verify error: ${verifyResponse.status} - ${errorText}`);
      
      // Try to parse error message
      let errorMessage = "Неверный код";
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail || errorData.error || errorMessage;
      } catch {}
      
      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const verifyData = await verifyResponse.json();
    console.log(`[telegram-crm-verify-code] Code verified successfully`);

    // Step 2: Generate webhook_key (UUID)
    const webhookKey = crypto.randomUUID();
    const selfHostedUrl = Deno.env.get("SELF_HOSTED_URL") || Deno.env.get("SUPABASE_URL") || "";
    const webhookUrl = `${selfHostedUrl}/functions/v1/telegram-crm-webhook?key=${webhookKey}`;

    // Step 3: Register webhook with Telegram CRM
    console.log(`[telegram-crm-verify-code] Registering webhook...`);
    
    const connectResponse = await fetch(`${TELEGRAM_CRM_API_URL}/webhook/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "lovable",
        webhook_url: webhookUrl,
        secret: webhookKey, // Use webhook_key as secret for X-Lovable-Secret header
      }),
    });

    if (!connectResponse.ok) {
      const errorText = await connectResponse.text();
      console.error(`[telegram-crm-verify-code] Webhook connect error: ${connectResponse.status} - ${errorText}`);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Ошибка регистрации webhook",
          details: errorText 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[telegram-crm-verify-code] Webhook registered successfully`);

    // Step 4: Create integration in database (use service role for this)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const integrationName = name || `Telegram ${cleanedPhone.slice(-4)}`;

    // Check if integration with this phone already exists
    const { data: existingIntegration } = await supabaseAdmin
      .from("messenger_integrations")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("messenger_type", "telegram")
      .eq("provider", "telegram_crm")
      .contains("settings", { crmPhoneNumber: cleanedPhone })
      .single();

    if (existingIntegration) {
      // Update existing integration
      const { error: updateError } = await supabaseAdmin
        .from("messenger_integrations")
        .update({
          name: integrationName,
          webhook_key: webhookKey,
          is_enabled: true,
          settings: {
            crmApiUrl: TELEGRAM_CRM_API_URL,
            crmPhoneNumber: cleanedPhone,
            secret: webhookKey,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingIntegration.id);

      if (updateError) {
        console.error(`[telegram-crm-verify-code] Update integration error:`, updateError);
        throw new Error("Ошибка обновления интеграции");
      }

      console.log(`[telegram-crm-verify-code] Integration updated: ${existingIntegration.id}`);

      return new Response(
        JSON.stringify({
          success: true,
          integration_id: existingIntegration.id,
          webhook_key: webhookKey,
          message: "Интеграция обновлена",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if this is the first integration for this type
    const { count } = await supabaseAdmin
      .from("messenger_integrations")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("messenger_type", "telegram");

    const isFirst = (count || 0) === 0;

    // Create new integration
    const { data: newIntegration, error: insertError } = await supabaseAdmin
      .from("messenger_integrations")
      .insert({
        organization_id: organizationId,
        messenger_type: "telegram",
        provider: "telegram_crm",
        name: integrationName,
        webhook_key: webhookKey,
        is_enabled: true,
        is_primary: isFirst, // First integration becomes primary
        priority: isFirst ? 1 : 10,
        settings: {
          crmApiUrl: TELEGRAM_CRM_API_URL,
          crmPhoneNumber: cleanedPhone,
          secret: webhookKey,
        },
      })
      .select("id")
      .single();

    if (insertError) {
      console.error(`[telegram-crm-verify-code] Insert integration error:`, insertError);
      throw new Error("Ошибка создания интеграции");
    }

    console.log(`[telegram-crm-verify-code] Integration created: ${newIntegration.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        integration_id: newIntegration.id,
        webhook_key: webhookKey,
        message: "Интеграция создана",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[telegram-crm-verify-code] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Внутренняя ошибка сервера" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
