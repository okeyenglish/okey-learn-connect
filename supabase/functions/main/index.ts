import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Background task: cleanup stale typing indicators every 10 seconds
let lastCleanupTime = 0;
const CLEANUP_INTERVAL_MS = 10_000;

async function cleanupStaleTypingStatus() {
  const now = Date.now();
  if (now - lastCleanupTime < CLEANUP_INTERVAL_MS) {
    return; // Too soon since last cleanup
  }
  lastCleanupTime = now;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Call the cleanup function we created
    const { data, error } = await supabase.rpc("cleanup_stale_typing_status");
    
    if (error) {
      // Function might not exist yet, silently ignore
      if (!error.message?.includes("does not exist")) {
        console.warn("[main] cleanup_stale_typing_status error:", error.message);
      }
    } else if (data && data > 0) {
      console.log(`[main] Cleaned up ${data} stale typing indicators`);
    }
  } catch (e) {
    // Non-critical, don't break routing
    console.warn("[main] cleanup_stale_typing_status exception:", e);
  }
}

function extractFunctionNameAndRemainder(pathname: string): { name: string | null; remainderPath: string } {
  const parts = pathname.split("/").filter(Boolean);

  // Expected: /functions/v1/<name>/...
  if (parts[0] === "functions" && parts[1] === "v1") {
    const name = parts[2] ?? null;
    const remainder = parts.slice(3);
    return { name, remainderPath: "/" + remainder.join("/") || "/" };
  }

  // Alternative: /<name>/...
  const name = parts[0] ?? null;
  const remainder = parts.slice(1);
  return { name, remainderPath: "/" + remainder.join("/") || "/" };
}

Deno.serve(async (req) => {
  // Fire-and-forget: trigger cleanup on every request (throttled internally)
  // @ts-ignore - EdgeRuntime.waitUntil is available in Supabase edge-runtime
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
    EdgeRuntime.waitUntil(cleanupStaleTypingStatus());
  } else {
    // Fallback for environments without waitUntil
    cleanupStaleTypingStatus().catch(() => {});
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const { name: functionName, remainderPath } = extractFunctionNameAndRemainder(url.pathname);

  // Health endpoint + diagnostics
  if (!functionName || functionName === "v1" || functionName === "functions") {
    return new Response(
      JSON.stringify({ status: "ok", message: "Edge Functions ready", ts: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Diagnostic endpoint: /functions/v1/main/diag?fn=salebot-webhook
  if (functionName === "main" && remainderPath.replace(/\/+$/, "") === "/diag") {
    const targetFn = url.searchParams.get("fn")?.trim();
    if (!targetFn) {
      return new Response(
        JSON.stringify({ error: "Missing query param fn" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const servicePathCandidates = [
      `${targetFn}`,
      `./${targetFn}`,
      `../${targetFn}`,
      `/home/deno/functions/${targetFn}`,
      `/home/deno/functions/${targetFn}/index.ts`,
    ];

    const envVarsObj = Deno.env.toObject();
    const envVars = Object.entries(envVarsObj);

    const results: Array<{ servicePath: string; ok: boolean; error?: string }> = [];

    for (const candidate of servicePathCandidates) {
      try {
        // @ts-ignore
        const worker = await EdgeRuntime.userWorkers.create({
          servicePath: candidate,
          memoryLimitMb: 256,
          workerTimeoutMs: 30 * 1000,
          noModuleCache: false,
          envVars,
          forceCreate: true,
          cpuTimeSoftLimitMs: 5000,
          cpuTimeHardLimitMs: 10000,
          staticPatterns: [],
          context: { useReadSyncFileAPI: true },
        });

        // Minimal fetch to ensure the worker boots and handles a request.
        const probe = new Request("http://localhost/", { method: "OPTIONS" });
        // @ts-ignore - EdgeRuntime is available in Supabase edge-runtime
        EdgeRuntime.applySupabaseTag(req, probe);
        const res = await worker.fetch(probe);
        await res.text();

        results.push({ servicePath: candidate, ok: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({ servicePath: candidate, ok: false, error: msg });
      }
    }

    return new Response(
      JSON.stringify({ fn: targetFn, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Default health for /functions/v1/main
  if (functionName === "main") {
    return new Response(
      JSON.stringify({ status: "ok", message: "Edge Functions ready", ts: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  console.log(`[main] Routing to: ${functionName}, remainder: ${remainderPath}`);

  try {
    // servicePath resolution differs between self-hosted setups.
    // The absolute path /home/deno/functions/${name} is the only one that works reliably.
    // Put it first to avoid boot errors with relative paths.
    const servicePathCandidates = [
      `/home/deno/functions/${functionName}`,
      `${functionName}`,
      `./${functionName}`,
      `../${functionName}`,
    ];
    const envVarsObj = Deno.env.toObject();
    const envVars = Object.entries(envVarsObj);

    const createWorker = async (servicePath: string) => {
      // @ts-ignore - EdgeRuntime is available in Supabase edge-runtime
      return await EdgeRuntime.userWorkers.create({
        servicePath,
        memoryLimitMb: 256,
        workerTimeoutMs: 5 * 60 * 1000,
        noModuleCache: false,
        envVars,
        forceCreate: false,
        cpuTimeSoftLimitMs: 10000,
        cpuTimeHardLimitMs: 20000,
        staticPatterns: [],
        context: { useReadSyncFileAPI: true },
      });
    };

    let worker: any;
    let lastErr: unknown = null;
    for (const candidate of servicePathCandidates) {
      try {
        console.log(`[main] Creating worker for ${functionName} with servicePath=${candidate}`);
        worker = await createWorker(candidate);
        break;
      } catch (e) {
        lastErr = e;
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`[main] Worker create failed for ${functionName} with servicePath=${candidate}: ${msg}`);
      }
    }

    if (!worker) {
      const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
      throw new Error(
        `All servicePath candidates failed for ${functionName}. Last error: ${msg}. Tried: ${servicePathCandidates.join(
          ', ',
        )}`,
      );
    }

    const forwardUrl = new URL(req.url);
    forwardUrl.pathname = remainderPath;

    const forwardedReq = new Request(forwardUrl.toString(), req);

    // Apply Supabase tag to the cloned request to prevent streamRid errors
    // @ts-ignore - EdgeRuntime is available in Supabase edge-runtime
    EdgeRuntime.applySupabaseTag(req, forwardedReq);

    return await worker.fetch(forwardedReq);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[main] worker error for ${functionName}:`, msg);

    return new Response(
      JSON.stringify({ error: "main worker error", details: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
