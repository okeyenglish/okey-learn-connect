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

    // 2. Build the new client data - copy messenger-specific fields
    const messengerLabel =
      messengerType === "whatsapp" ? "WhatsApp" :
      messengerType === "telegram" ? "Telegram" : "MAX";

    const newClientData: Record<string, unknown> = {
      name: `${client.name || "Без имени"} (${messengerLabel})`,
      organization_id: client.organization_id,
      status: client.status || "active",
      is_active: true,
      phone: null,
      branch: client.branch || null,
    };

    // Copy the relevant messenger IDs to the new client
    if (messengerType === "telegram") {
      newClientData.telegram_user_id = client.telegram_user_id;
    } else if (messengerType === "whatsapp") {
      newClientData.whatsapp_id = client.whatsapp_id;
      // Try to extract phone from whatsapp_id
      if (client.whatsapp_id) {
        const digits = client.whatsapp_id.replace(/@c\.us$/i, "").replace(/\D/g, "");
        if (digits.length >= 10) {
          newClientData.phone = digits;
        }
      }
    }
    // For MAX: max_chat_id is stored in chat_messages metadata, not on client

    // 3. Insert new client
    const { data: newClient, error: insertError } = await supabase
      .from("clients")
      .insert(newClientData)
      .select("id, name")
      .single();

    if (insertError || !newClient) {
      console.error("[unlink-messenger] Failed to create new client:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create new client", details: insertError?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[unlink-messenger] Created new client ${newClient.id} (${newClient.name})`);

    // 4. Move messages of this messenger type to the new client
    // Map messenger type to the value stored in chat_messages.messenger column
    const messengerValue =
      messengerType === "whatsapp" ? "whatsapp" :
      messengerType === "telegram" ? "telegram" :
      messengerType === "max" ? "max" : messengerType;

    // Also handle messenger_type column (some schemas use this instead)
    const { data: movedMessages, error: moveError } = await supabase
      .from("chat_messages")
      .update({ client_id: newClient.id })
      .eq("client_id", clientId)
      .or(`messenger.eq.${messengerValue},messenger_type.eq.${messengerValue}`)
      .select("id");

    if (moveError) {
      console.error("[unlink-messenger] Failed to move messages:", moveError);
      // Try simpler query without OR (some schemas only have one column)
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

    // 5. Clear messenger fields on the original client
    const clearFields: Record<string, unknown> = {};
    if (messengerType === "telegram") {
      clearFields.telegram_user_id = null;
    } else if (messengerType === "whatsapp") {
      clearFields.whatsapp_id = null;
    }

    if (Object.keys(clearFields).length > 0) {
      const { error: clearError } = await supabase
        .from("clients")
        .update(clearFields)
        .eq("id", clientId);

      if (clearError) {
        console.warn("[unlink-messenger] Failed to clear messenger fields:", clearError);
      }
    }

    // 6. If client_phone_numbers table exists, try to move/clear messenger data there too
    try {
      if (messengerType === "telegram") {
        await supabase
          .from("client_phone_numbers")
          .update({
            telegram_chat_id: null,
            telegram_user_id: null,
            is_telegram_enabled: false,
          })
          .eq("client_id", clientId);
      } else if (messengerType === "whatsapp") {
        await supabase
          .from("client_phone_numbers")
          .update({
            whatsapp_chat_id: null,
            is_whatsapp_enabled: false,
          })
          .eq("client_id", clientId);
      } else if (messengerType === "max") {
        await supabase
          .from("client_phone_numbers")
          .update({
            max_chat_id: null,
          })
          .eq("client_id", clientId);
      }
    } catch (e) {
      console.warn("[unlink-messenger] client_phone_numbers update failed (table may not exist):", e);
    }

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
