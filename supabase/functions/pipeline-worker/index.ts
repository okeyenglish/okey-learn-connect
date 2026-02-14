import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Pipeline Worker — Orchestrator
 * 
 * Claims jobs from processing_jobs via FOR UPDATE SKIP LOCKED
 * and dispatches to appropriate processors.
 * 
 * Called by cron every 30s or by webhook.
 * 
 * Job types and their chains:
 *   normalize_message → embed_message → annotate_message
 *   batch_embed → (done)
 *   batch_annotate → (done)
 *   cluster_semantic → (done)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Job type → next job in chain
const JOB_CHAIN: Record<string, string | null> = {
  normalize_message: 'embed_message',
  embed_message: 'annotate_message',
  annotate_message: null,
  batch_embed: null,
  batch_annotate: null,
  cluster_semantic: null,
};

// Job type → worker group (for separate scaling)
const WORKER_GROUPS: Record<string, string[]> = {
  normalize: ['normalize_message'],
  embed: ['embed_message', 'batch_embed'],
  annotate: ['annotate_message', 'batch_annotate'],
  cluster: ['cluster_semantic'],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SELF_HOSTED_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const workerGroup = body.worker_group || 'normalize'; // which workers to run
    const batchSize = body.batch_size || 20;
    const workerId = body.worker_id || `worker-${crypto.randomUUID().slice(0, 8)}`;

    const jobTypes = WORKER_GROUPS[workerGroup] || WORKER_GROUPS.normalize;

    // Claim jobs using SKIP LOCKED
    const { data: jobs, error: claimError } = await supabase
      .rpc('claim_processing_jobs', {
        p_job_types: jobTypes,
        p_limit: batchSize,
        p_worker_id: workerId,
      });

    if (claimError) {
      console.error('[pipeline-worker] Claim error:', claimError);
      return new Response(JSON.stringify({ error: claimError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ 
        status: 'idle', 
        worker_group: workerGroup,
        message: 'No pending jobs' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[pipeline-worker] ${workerId} claimed ${jobs.length} ${workerGroup} jobs`);

    const results = { completed: 0, failed: 0, chained: 0 };

    for (const job of jobs) {
      try {
        await processJob(supabase, job);

        // Mark completed
        await supabase.rpc('complete_job', { p_job_id: job.id, p_status: 'completed' });
        results.completed++;

        // Chain next job
        const nextJobType = JOB_CHAIN[job.job_type];
        if (nextJobType) {
          await supabase.rpc('enqueue_ai_job', {
            p_organization_id: job.organization_id,
            p_job_type: nextJobType,
            p_entity_type: job.entity_type,
            p_entity_id: job.entity_id,
            p_priority: job.priority,
            p_payload: job.payload || {},
          });
          results.chained++;
        }
      } catch (err) {
        console.error(`[pipeline-worker] Job ${job.id} failed:`, err.message);
        await supabase.rpc('complete_job', { 
          p_job_id: job.id, 
          p_status: 'failed', 
          p_error: err.message?.slice(0, 500) 
        });
        results.failed++;
      }
    }

    console.log(`[pipeline-worker] ${workerId} done:`, results);

    return new Response(JSON.stringify({
      status: 'ok',
      worker_id: workerId,
      worker_group: workerGroup,
      jobs_claimed: jobs.length,
      ...results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[pipeline-worker] Fatal error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Process a single job based on its type
 */
async function processJob(supabase: any, job: any) {
  switch (job.job_type) {
    case 'normalize_message':
      await normalizeMessage(supabase, job);
      break;
    case 'embed_message':
      await embedMessage(supabase, job);
      break;
    case 'annotate_message':
      await annotateMessage(supabase, job);
      break;
    case 'batch_embed':
      await batchEmbed(supabase, job);
      break;
    case 'batch_annotate':
      await batchAnnotate(supabase, job);
      break;
    default:
      console.log(`[pipeline-worker] Unknown job type: ${job.job_type}`);
  }
}

/**
 * Normalize a message: lowercase, strip punctuation, hash
 */
async function normalizeMessage(supabase: any, job: any) {
  const { data: msg } = await supabase
    .from('chat_messages')
    .select('id, content')
    .eq('id', job.entity_id)
    .maybeSingle();

  if (!msg?.content) return;

  const normalized = normalizeText(msg.content);
  const hash = await md5Hash(normalized);
  const tokensCount = Math.ceil(normalized.split(/\s+/).length * 1.3);

  await supabase.from('messages_normalized').upsert({
    message_id: msg.id,
    normalized_text: normalized,
    text_hash: hash,
    language: detectLanguage(normalized),
    tokens_count: tokensCount,
  }, { onConflict: 'message_id' });
}

/**
 * Embed a normalized message into embeddings_registry
 */
async function embedMessage(supabase: any, job: any) {
  // Check if already embedded
  const { data: existing } = await supabase
    .from('embeddings_registry')
    .select('id')
    .eq('entity_type', 'message')
    .eq('entity_id', job.entity_id)
    .eq('model_name', 'text-embedding-3-small')
    .maybeSingle();

  if (existing) return; // already done

  // Get normalized text
  const { data: norm } = await supabase
    .from('messages_normalized')
    .select('normalized_text, text_hash')
    .eq('message_id', job.entity_id)
    .maybeSingle();

  if (!norm?.normalized_text) return;

  // Check intent cache — skip if we already know this hash
  const { data: cached } = await supabase
    .rpc('lookup_intent_cache', { p_text_hash: norm.text_hash });
  
  if (cached && cached.length > 0) {
    // Already processed this exact text — skip embedding, go straight to annotation
    return;
  }

  const embedding = await getEmbedding(norm.normalized_text);

  await supabase.from('embeddings_registry').insert({
    entity_type: 'message',
    entity_id: job.entity_id,
    model_name: 'text-embedding-3-small',
    embedding: JSON.stringify(embedding),
  });
}

/**
 * Annotate message with intent/stage via LLM
 */
async function annotateMessage(supabase: any, job: any) {
  const { data: norm } = await supabase
    .from('messages_normalized')
    .select('normalized_text, text_hash')
    .eq('message_id', job.entity_id)
    .maybeSingle();

  if (!norm?.normalized_text) return;

  // Check intent cache first
  const { data: cached } = await supabase
    .rpc('lookup_intent_cache', { p_text_hash: norm.text_hash });

  let intent: string;
  let stage: string;
  let model_used: string;

  if (cached && cached.length > 0) {
    intent = cached[0].intent;
    stage = cached[0].stage || 'unknown';
    model_used = 'cache';
  } else {
    // Call LLM via model router (cheap tier)
    const { routeModelRequest } = await import('../_shared/model-router.ts');
    const result = await routeModelRequest({
      task: 'batch_classification',
      messages: [{
        role: 'system',
        content: 'Classify the intent and conversation stage. Return JSON: {"intent":"...","stage":"..."}'
      }, {
        role: 'user',
        content: norm.normalized_text,
      }],
    });

    try {
      const parsed = JSON.parse(result.content);
      intent = parsed.intent || 'unknown';
      stage = parsed.stage || 'unknown';
    } catch {
      intent = 'unknown';
      stage = 'unknown';
    }
    model_used = result.model;

    // Cache for future
    await supabase.rpc('upsert_intent_cache', {
      p_text_hash: norm.text_hash,
      p_normalized_text: norm.normalized_text,
      p_intent: intent,
      p_stage: stage,
      p_model_used: model_used,
      p_confidence: 0.8,
    });
  }

  // Write versioned annotation
  await supabase.from('ai_annotations').upsert({
    organization_id: job.organization_id,
    entity_type: 'message',
    entity_id: job.entity_id,
    annotation_type: 'intent',
    version: 1,
    value_json: { intent, stage },
    model_used,
    confidence: model_used === 'cache' ? 0.95 : 0.8,
  }, { onConflict: 'entity_type,entity_id,annotation_type,version' });
}

/**
 * Batch embed multiple semantic units at once
 */
async function batchEmbed(supabase: any, job: any) {
  const entityIds = job.payload?.entity_ids || [];
  if (entityIds.length === 0) return;

  for (const entityId of entityIds) {
    await embedMessage(supabase, { ...job, entity_id: entityId });
  }
}

/**
 * Batch annotate multiple messages
 */
async function batchAnnotate(supabase: any, job: any) {
  const entityIds = job.payload?.entity_ids || [];
  if (entityIds.length === 0) return;

  // Batch: send multiple texts in one LLM call
  const texts: Array<{ id: string; text: string; hash: string }> = [];

  for (const id of entityIds.slice(0, 20)) {
    const { data } = await supabase
      .from('messages_normalized')
      .select('normalized_text, text_hash')
      .eq('message_id', id)
      .maybeSingle();
    if (data?.normalized_text) {
      texts.push({ id, text: data.normalized_text, hash: data.text_hash });
    }
  }

  if (texts.length === 0) return;

  const { routeModelRequest } = await import('../_shared/model-router.ts');
  const result = await routeModelRequest({
    task: 'batch_classification',
    messages: [{
      role: 'system',
      content: `Classify intents for ${texts.length} messages. Return JSON array: [{"id":"...","intent":"...","stage":"..."}]`
    }, {
      role: 'user',
      content: texts.map((t, i) => `[${i}] ${t.text}`).join('\n'),
    }],
    overrideMaxTokens: 1000,
  });

  try {
    const parsed = JSON.parse(result.content);
    for (let i = 0; i < parsed.length && i < texts.length; i++) {
      const item = parsed[i];
      const t = texts[i];
      
      await supabase.rpc('upsert_intent_cache', {
        p_text_hash: t.hash,
        p_normalized_text: t.text,
        p_intent: item.intent || 'unknown',
        p_stage: item.stage || 'unknown',
        p_model_used: result.model,
        p_confidence: 0.8,
      });

      await supabase.from('ai_annotations').upsert({
        organization_id: job.organization_id,
        entity_type: 'message',
        entity_id: t.id,
        annotation_type: 'intent',
        version: 1,
        value_json: { intent: item.intent, stage: item.stage },
        model_used: result.model,
        confidence: 0.8,
      }, { onConflict: 'entity_type,entity_id,annotation_type,version' });
    }
  } catch (e) {
    console.error('[pipeline-worker] Batch annotate parse error:', e);
  }
}

// ============================================================
// Helpers
// ============================================================

function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^\u0400-\u04FFa-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectLanguage(text: string): string {
  const cyrillic = (text.match(/[\u0400-\u04FF]/g) || []).length;
  const latin = (text.match(/[a-z]/g) || []).length;
  return cyrillic > latin ? 'ru' : 'en';
}

async function md5Hash(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('MD5', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getEmbedding(text: string): Promise<number[]> {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  const apiUrl = lovableKey 
    ? 'https://ai.gateway.lovable.dev/v1/embeddings'
    : 'https://api.openai.com/v1/embeddings';
  const apiKey = lovableKey || openaiKey;
  if (!apiKey) throw new Error('No AI API key');

  const resp = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 8000) }),
  });

  if (!resp.ok) throw new Error(`Embedding error: ${resp.status}`);
  const data = await resp.json();
  return data.data[0].embedding;
}
