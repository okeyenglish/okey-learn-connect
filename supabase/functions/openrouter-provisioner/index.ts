// OpenRouter Provisioning Edge Function
// Processes queue of key provision jobs
// Deploy: supabase functions deploy openrouter-provisioner --no-verify-jwt

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENROUTER_PROVISIONING_KEY = Deno.env.get("OPENROUTER_PROVISIONING_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Process up to 5 jobs per invocation
const BATCH_SIZE = parseInt(Deno.env.get("OR_BATCH_SIZE") ?? "5", 10);
// Delay between jobs to respect rate limit (~1 req/sec)
const PER_JOB_DELAY_MS = parseInt(Deno.env.get("OR_DELAY_MS") ?? "1100", 10);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type ProvisionJob = {
  id: number;
  organization_id: string | null;
  teacher_id: string | null;
  entity_name: string;
  monthly_limit: number;
  reset_policy: "daily" | "weekly" | "monthly";
};

type OpenRouterKeyResponse = {
  data: {
    hash: string;
    name: string;
    limit: number;
    limit_remaining: number;
    disabled?: boolean;
  };
};

async function supabaseRPC(functionName: string, params?: any) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: params ? JSON.stringify(params) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`RPC ${functionName} failed: ${text}`);
  }

  return response.json();
}

async function supabaseInsert(table: string, data: any) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Insert to ${table} failed: ${text}`);
  }
}

async function createOpenRouterKey(
  name: string,
  limit: number,
  resetPolicy: string
): Promise<OpenRouterKeyResponse["data"]> {
  const response = await fetch("https://openrouter.ai/api/v1/keys", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_PROVISIONING_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      limit,
      limit_reset: resetPolicy,
      include_byok_in_limit: true,
    }),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json?.error || JSON.stringify(json));
  }

  return json.data;
}

async function saveProvisionedKey(
  job: ProvisionJob,
  keyData: OpenRouterKeyResponse["data"]
) {
  // Create masked preview
  const preview = keyData.hash.length > 12
    ? `${keyData.hash.slice(0, 10)}…${keyData.hash.slice(-6)}`
    : keyData.hash;

  await supabaseInsert("ai_provider_keys", {
    organization_id: job.organization_id,
    teacher_id: job.teacher_id,
    provider: "openrouter",
    key_label: keyData.name,
    key_value: keyData.hash,
    key_preview: preview,
    limit_monthly: keyData.limit,
    limit_remaining: keyData.limit_remaining,
    reset_policy: job.reset_policy,
    status: keyData.disabled ? "disabled" : "active",
  });
}

async function processJob(job: ProvisionJob): Promise<void> {
  const entityType = job.organization_id ? "org" : "teacher";
  const keyName = `${entityType}:${job.entity_name}`;

  console.log(`Processing job ${job.id}: creating key for ${keyName}`);

  // Create key in OpenRouter
  const keyData = await createOpenRouterKey(
    keyName,
    job.monthly_limit,
    job.reset_policy
  );

  console.log(`Created OpenRouter key: ${keyData.name} (${keyData.limit} req/${job.reset_policy})`);

  // Save to database
  await saveProvisionedKey(job, keyData);

  console.log(`Saved key to database for job ${job.id}`);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let processed = 0;
    const results: Array<{ jobId: number; success: boolean; error?: string }> = [];

    for (let i = 0; i < BATCH_SIZE; i++) {
      // Dequeue next job
      const jobs: ProvisionJob[] = await supabaseRPC("dequeue_ai_key_job");

      if (!jobs || jobs.length === 0) {
        console.log("No more jobs in queue");
        break;
      }

      const job = jobs[0];

      try {
        await processJob(job);
        await supabaseRPC("complete_ai_key_job", { p_id: job.id });
        
        processed++;
        results.push({ jobId: job.id, success: true });

        console.log(`✓ Job ${job.id} completed successfully`);

        // Respect rate limit (~1 req/sec)
        if (i < BATCH_SIZE - 1) {
          await new Promise((resolve) => setTimeout(resolve, PER_JOB_DELAY_MS));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Exponential backoff: 5, 10, 20, 40, 80, 160, 320 seconds
        const attemptBackoff = Math.min(2 ** (i + 1) * 5, 320);
        
        await supabaseRPC("fail_ai_key_job", {
          p_id: job.id,
          p_error: errorMessage,
          p_backoff_seconds: attemptBackoff,
        });

        results.push({ jobId: job.id, success: false, error: errorMessage });

        console.error(`✗ Job ${job.id} failed:`, errorMessage);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        processed,
        results,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error("Function error:", errorMessage);

    return new Response(
      JSON.stringify({
        ok: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
