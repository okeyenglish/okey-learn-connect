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
    // We'll try a small set of known-good candidates to avoid
    // "failed to bootstrap runtime: could not find an appropriate entrypoint".
    const servicePathCandidates = [
      `${functionName}`,
      `./${functionName}`,
      `../${functionName}`,
      `/home/deno/functions/${functionName}`,
      `/home/deno/functions/${functionName}/index.ts`,
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
