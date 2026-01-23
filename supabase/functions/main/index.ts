const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const { name: functionName, remainderPath } = extractFunctionNameAndRemainder(url.pathname);

  // Health endpoint
  if (!functionName || functionName === "main" || functionName === "v1" || functionName === "functions") {
    return new Response(
      JSON.stringify({ status: "ok", message: "Edge Functions ready", ts: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  console.log(`[main] Routing to: ${functionName}, remainder: ${remainderPath}`);

  try {
    const servicePath = `../${functionName}`;
    const envVarsObj = Deno.env.toObject();
    const envVars = Object.entries(envVarsObj);

    // @ts-ignore - EdgeRuntime is available in Supabase edge-runtime
    const worker = await EdgeRuntime.userWorkers.create({
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

    const forwardUrl = new URL(req.url);
    forwardUrl.pathname = remainderPath;

    const forwardedReq = new Request(forwardUrl.toString(), req);
    return await worker.fetch(forwardedReq);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[main] worker error:", msg);

    return new Response(
      JSON.stringify({ error: "main worker error", details: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
