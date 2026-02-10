import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SELF_HOSTED_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { clientId, messengerType } = await req.json();

    if (!clientId || !messengerType) {
      return new Response(
        JSON.stringify({ error: "clientId and messengerType are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["whatsapp", "telegram", "max"].includes(messengerType)) {
      return new Response(
        JSON.stringify({ error: "messengerType must be whatsapp, telegram, or max" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[unlink-messenger] Unlinking ${messengerType} from client ${clientId}`);

    // 1. Get the original client
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ error: "Client not found", details: clientError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const messengerLabel =
      messengerType === "whatsapp" ? "WhatsApp" :
      messengerType === "telegram" ? "Telegram" : "MAX";

    // 2. Save original fields for rollback, then CLEAR them BEFORE insert
    const savedFields: Record<string, unknown> = {};
    const clearFields: Record<string, unknown> = {};

    if (messengerType === "telegram") {
      savedFields.telegram_user_id = client.telegram_user_id;
      clearFields.telegram_user_id = null;
    }
    // whatsapp_id may not exist on self-hosted — skip

    if (Object.keys(clearFields).length > 0) {
      const { error: clearError } = await supabase
        .from("clients")
        .update(clearFields)
        .eq("id", clientId);

      if (clearError) {
        console.error("[unlink-messenger] Failed to clear messenger fields:", clearError);
        return new Response(
          JSON.stringify({ error: "Failed to clear messenger fields before transfer", details: clearError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log(`[unlink-messenger] Cleared ${Object.keys(clearFields).join(", ")} from original client`);
    }

    // 2b. Clear client_phone_numbers before insert too
    try {
      if (messengerType === "telegram") {
        await supabase
          .from("client_phone_numbers")
          .update({ telegram_chat_id: null, telegram_user_id: null, is_telegram_enabled: false })
          .eq("client_id", clientId);
      } else if (messengerType === "whatsapp") {
        await supabase
          .from("client_phone_numbers")
          .update({ whatsapp_chat_id: null, is_whatsapp_enabled: false })
          .eq("client_id", clientId);
      } else if (messengerType === "max") {
        await supabase
          .from("client_phone_numbers")
          .update({ max_chat_id: null })
          .eq("client_id", clientId);
      }
    } catch (e) {
      console.warn("[unlink-messenger] client_phone_numbers pre-clear failed (table may not exist):", e);
    }

    // 3. Build the new client data
    const newClientData: Record<string, unknown> = {
      name: `${client.name || "Без имени"} (${messengerLabel})`,
      organization_id: client.organization_id,
      phone: null,
      branch: client.branch || null,
    };

    if (messengerType === "telegram") {
      newClientData.telegram_user_id = savedFields.telegram_user_id ?? client.telegram_user_id;
    } else if (messengerType === "whatsapp") {
      const waId = client.whatsapp_id || client.phone;
      if (waId) {
        const digits = String(waId).replace(/@c\.us$/i, "").replace(/\D/g, "");
        if (digits.length >= 10) {
          newClientData.phone = digits;
        }
      }
    }

    // 4. Insert new client
    const { data: newClient, error: insertError } = await supabase
      .from("clients")
      .insert(newClientData)
      .select("id, name")
      .single();

    if (insertError || !newClient) {
      console.error("[unlink-messenger] Failed to create new client:", insertError);

      // Rollback: restore cleared fields on original client
      if (Object.keys(savedFields).length > 0) {
        console.log("[unlink-messenger] Rolling back cleared fields on original client");
        await supabase.from("clients").update(savedFields).eq("id", clientId);
      }

      return new Response(
        JSON.stringify({ error: "Failed to create new client", details: insertError?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[unlink-messenger] Created new client ${newClient.id} (${newClient.name})`);

    // 5. Move messages of this messenger type to the new client
    const messengerValue = messengerType;

    const { data: movedMessages, error: moveError } = await supabase
      .from("chat_messages")
      .update({ client_id: newClient.id })
      .eq("client_id", clientId)
      .or(`messenger.eq.${messengerValue},messenger_type.eq.${messengerValue}`)
      .select("id");

    if (moveError) {
      console.error("[unlink-messenger] Failed to move messages:", moveError);
      const { error: moveError2 } = await supabase
        .from("chat_messages")
        .update({ client_id: newClient.id })
        .eq("client_id", clientId)
        .eq("messenger_type", messengerValue);

      if (moveError2) {
        console.error("[unlink-messenger] Fallback move also failed:", moveError2);
      }
    }

    const movedCount = movedMessages?.length || 0;
    console.log(`[unlink-messenger] Moved ${movedCount} messages to new client`);

    return new Response(
      JSON.stringify({
        success: true,
        newClientId: newClient.id,
        newClientName: newClient.name,
        movedMessages: movedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[unlink-messenger] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
