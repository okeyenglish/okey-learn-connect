import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Connect to self-hosted Supabase with service_role
    const supabaseUrl =
      Deno.env.get("SELF_HOSTED_URL") ?? Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const results: Record<string, unknown> = {};

    // 1. Delete webhook_logs older than 30 days
    const { count: webhookCount, error: webhookErr } = await supabase
      .from("webhook_logs")
      .delete({ count: "exact" })
      .lt("created_at", new Date(Date.now() - 30 * 86400000).toISOString());

    results.webhook_logs = webhookErr
      ? { error: webhookErr.message }
      : { deleted: webhookCount };

    // 2. Delete event_bus older than 30 days
    const { count: eventCount, error: eventErr } = await supabase
      .from("event_bus")
      .delete({ count: "exact" })
      .lt("created_at", new Date(Date.now() - 30 * 86400000).toISOString());

    results.event_bus = eventErr
      ? { error: eventErr.message }
      : { deleted: eventCount };

    // 3. Delete cron.job_run_details older than 7 days via RPC
    // pg_cron tables are in cron schema — use raw SQL via rpc if available,
    // otherwise skip (cron cleanup handled by separate SQL)
    try {
      const { data: cronData, error: cronErr } = await supabase.rpc(
        "cleanup_cron_job_run_details",
        { days_to_keep: 7 }
      );
      results.cron_job_run_details = cronErr
        ? { error: cronErr.message, hint: "RPC not found — run setup SQL" }
        : { deleted: cronData };
    } catch {
      results.cron_job_run_details = {
        skipped: true,
        hint: "cleanup_cron_job_run_details RPC not available",
      };
    }

    console.log("[db-maintenance] Results:", JSON.stringify(results));

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[db-maintenance] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

