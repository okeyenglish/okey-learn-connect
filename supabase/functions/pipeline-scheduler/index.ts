import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Pipeline Scheduler — Triggers workers and manages backfill
 * 
 * Endpoints:
 *   POST /tick        — run one cycle of all worker groups
 *   POST /backfill    — enqueue historical messages for processing
 *   GET  /stats       — pipeline statistics
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SELF_HOSTED_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    switch (path) {
      case 'tick':
        return await handleTick(supabase);
      case 'backfill':
        return await handleBackfill(req, supabase);
      case 'stats':
        return await handleStats(supabase);
      default:
        return await handleTick(supabase);
    }

  } catch (err) {
    console.error('[pipeline-scheduler] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Run one tick — invoke pipeline-worker for each group sequentially
 */
async function handleTick(supabase: any) {
  const selfUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SELF_HOSTED_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const groups = ['normalize', 'embed', 'annotate'];
  const results: Record<string, any> = {};

  for (const group of groups) {
    try {
      const resp = await fetch(`${selfUrl}/functions/v1/pipeline-worker`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ worker_group: group, batch_size: 20 }),
      });
      results[group] = await resp.json();
    } catch (err) {
      results[group] = { error: err.message };
    }
  }

  return new Response(JSON.stringify({ status: 'tick_complete', results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Enqueue historical messages for backfill processing
 */
async function handleBackfill(req: Request, supabase: any) {
  const body = await req.json().catch(() => ({}));
  const orgId = body.organization_id;
  const limit = body.limit || 1000;
  const priority = body.priority || 10; // low priority for backfill

  if (!orgId) {
    return new Response(JSON.stringify({ error: 'organization_id required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Find messages not yet normalized
  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select('id')
    .eq('organization_id', orgId)
    .eq('direction', 'incoming')
    .not('content', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Filter out already-processed
  const messageIds = messages?.map((m: any) => m.id) || [];
  
  const { data: alreadyNormalized } = await supabase
    .from('messages_normalized')
    .select('message_id')
    .in('message_id', messageIds);

  const normalizedSet = new Set((alreadyNormalized || []).map((r: any) => r.message_id));
  const toProcess = messageIds.filter((id: string) => !normalizedSet.has(id));

  // Enqueue in batches
  let enqueued = 0;
  for (const id of toProcess) {
    await supabase.rpc('enqueue_ai_job', {
      p_organization_id: orgId,
      p_job_type: 'normalize_message',
      p_entity_type: 'message',
      p_entity_id: id,
      p_priority: priority,
      p_payload: {},
    });
    enqueued++;
  }

  return new Response(JSON.stringify({
    status: 'backfill_enqueued',
    total_messages: messageIds.length,
    already_processed: normalizedSet.size,
    enqueued,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Pipeline statistics
 */
async function handleStats(supabase: any) {
  const { data: stats } = await supabase
    .from('pipeline_stats')
    .select('*');

  // Queue depth
  const { count: queueDepth } = await supabase
    .from('processing_jobs')
    .select('*', { count: 'exact', head: true })
    .in('status', ['pending', 'retry']);

  // Failed jobs
  const { count: failedCount } = await supabase
    .from('processing_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'failed');

  return new Response(JSON.stringify({
    pipeline_stats: stats || [],
    queue_depth: queueDepth || 0,
    failed_jobs: failedCount || 0,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
