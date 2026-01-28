import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DiagnosticsRequest {
  action: 'webhooks' | 'calls' | 'search';
  phone?: string;
  limit?: number;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get auth header for user context
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token to verify they have access
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's organization_id from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return new Response(
        JSON.stringify({ success: false, error: "User has no organization" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const organizationId = profile.organization_id;

    // Parse request body
    const body: DiagnosticsRequest = await req.json();
    const { action, phone, limit = 20 } = body;

    console.log(`[onlinepbx-diagnostics] Action: ${action}, Phone: ${phone}, Org: ${organizationId}`);

    // Normalize phone number for search (extract last 10 digits)
    const normalizePhone = (phoneNumber: string): string => {
      const digits = phoneNumber.replace(/\D/g, '');
      return digits.slice(-10);
    };

    // Generate phone search variants
    const generatePhoneVariants = (normalizedPhone: string): string[] => {
      if (normalizedPhone.length !== 10) return [normalizedPhone];
      return [
        `+7${normalizedPhone}`,
        `7${normalizedPhone}`,
        `8${normalizedPhone}`,
        normalizedPhone,
        `+7 (${normalizedPhone.slice(0, 3)}) ${normalizedPhone.slice(3, 6)}-${normalizedPhone.slice(6, 8)}-${normalizedPhone.slice(8)}`,
      ];
    };

    let result: { webhooks?: unknown[]; calls?: unknown[] } = {};

    if (action === 'webhooks' || action === 'search') {
      // Get webhook logs for OnlinePBX
      let webhooksQuery = supabase
        .from("webhook_logs")
        .select("*")
        .eq("organization_id", organizationId)
        .or("source.eq.onlinepbx,source.eq.OnlinePBX,event_type.ilike.%onlinepbx%,event_type.eq.raw_webhook")
        .order("created_at", { ascending: false })
        .limit(limit);

      // If searching, try to filter by phone in webhook_data
      if (action === 'search' && phone) {
        const normalized = normalizePhone(phone);
        // We'll filter in JS since JSONB search is complex
        webhooksQuery = webhooksQuery.limit(100); // Get more to filter
      }

      const { data: webhooks, error: webhooksError } = await webhooksQuery;

      if (webhooksError) {
        console.error("[onlinepbx-diagnostics] Error fetching webhooks:", webhooksError);
      }

      // Filter by phone if searching
      let filteredWebhooks = webhooks || [];
      if (action === 'search' && phone) {
        const normalized = normalizePhone(phone);
        filteredWebhooks = filteredWebhooks.filter((w: Record<string, unknown>) => {
          const data = w.webhook_data as Record<string, unknown> | null;
          if (!data) return false;
          const jsonStr = JSON.stringify(data).toLowerCase();
          return jsonStr.includes(normalized) || 
                 jsonStr.includes(phone.toLowerCase());
        }).slice(0, limit);
      }

      result.webhooks = filteredWebhooks.map((w: Record<string, unknown>) => ({
        id: w.id,
        created_at: w.created_at,
        event_type: w.event_type,
        source: w.source,
        processed: w.processed,
        webhook_data: w.webhook_data,
        error_message: w.error_message,
      }));
    }

    if (action === 'calls' || action === 'search') {
      // Get call logs
      let callsQuery = supabase
        .from("call_logs")
        .select(`
          id,
          phone_number,
          started_at,
          ended_at,
          duration_seconds,
          status,
          direction,
          recording_url,
          transcription,
          ai_evaluation,
          notes,
          summary,
          agreements,
          tasks,
          client_id,
          manager_id,
          created_at
        `)
        .eq("organization_id", organizationId)
        .order("started_at", { ascending: false })
        .limit(limit);

      // If searching by phone
      if (action === 'search' && phone) {
        const normalized = normalizePhone(phone);
        const variants = generatePhoneVariants(normalized);
        
        // Build OR filter for phone variants
        const phoneFilters = variants.map(v => `phone_number.ilike.%${v}%`).join(',');
        callsQuery = callsQuery.or(phoneFilters);
      }

      const { data: calls, error: callsError } = await callsQuery;

      if (callsError) {
        console.error("[onlinepbx-diagnostics] Error fetching calls:", callsError);
      }

      result.calls = calls || [];
    }

    console.log(`[onlinepbx-diagnostics] Found ${result.webhooks?.length || 0} webhooks, ${result.calls?.length || 0} calls`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        ...result,
        searchedPhone: phone ? normalizePhone(phone) : null
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[onlinepbx-diagnostics] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
