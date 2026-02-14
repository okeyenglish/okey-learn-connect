import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { corsHeaders, handleCors, errorResponse, successResponse } from '../_shared/types.ts';
import { getEmbedding, cosineSimilarity, normalizeTextForHash, hashText } from '../_shared/model-router.ts';

/**
 * Semantic Dedup Pipeline
 * 
 * Этапы:
 * 1. Normalize + exact hash dedup
 * 2. Embeddings для уникальных текстов
 * 3. Cosine similarity кластеризация (threshold-based)
 * 4. Выбор canonical message для каждого кластера
 * 5. Результат: вместо N LLM-вызовов → N/K вызовов
 */

const SIMILARITY_THRESHOLD = 0.92; // cosine similarity для объединения в кластер
const BATCH_SIZE = 50; // embeddings batch
const MAX_MESSAGES = 5000; // максимум за один запуск

interface ClusterResult {
  clustersCreated: number;
  messagesProcessed: number;
  uniqueHashes: number;
  duplicatesSkipped: number;
  embeddingsCreated: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { organization_id, source = 'chat_messages', limit = MAX_MESSAGES } = await req.json().catch(() => ({}));

    if (!organization_id) {
      return errorResponse('organization_id required', 400);
    }

    const selfHostedUrl = Deno.env.get('SELF_HOSTED_URL') || Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(selfHostedUrl, serviceKey);

    console.log(`[semantic-dedup] Starting for org=${organization_id}, source=${source}`);

    // ==========================================
    // Step 1: Fetch messages + normalize + hash dedup
    // ==========================================
    let rawMessages: Array<{ id: string; text: string }> = [];

    if (source === 'chat_messages') {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, content')
        .eq('organization_id', organization_id)
        .eq('direction', 'incoming')
        .not('content', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) return errorResponse(error.message, 500);
      rawMessages = (data || [])
        .filter((m: any) => m.content && m.content.length > 5)
        .map((m: any) => ({ id: m.id, text: m.content }));
    } else if (source === 'conversation_segments') {
      const { data, error } = await supabase
        .from('conversation_segments')
        .select('id, client_text')
        .eq('organization_id', organization_id)
        .not('client_text', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) return errorResponse(error.message, 500);
      rawMessages = (data || [])
        .filter((m: any) => m.client_text && m.client_text.length > 5)
        .map((m: any) => ({ id: m.id, text: m.client_text }));
    }

    console.log(`[semantic-dedup] Raw messages: ${rawMessages.length}`);

    if (rawMessages.length === 0) {
      return successResponse({ message: 'No messages to process', ...emptyResult() });
    }

    // Step 1b: Exact hash dedup
    const hashMap = new Map<string, { id: string; text: string; normalized: string }>();
    let duplicatesSkipped = 0;

    for (const msg of rawMessages) {
      const hash = await hashText(msg.text);
      if (hashMap.has(hash)) {
        duplicatesSkipped++;
      } else {
        hashMap.set(hash, { ...msg, normalized: normalizeTextForHash(msg.text) });
      }
    }

    const uniqueMessages = Array.from(hashMap.values());
    console.log(`[semantic-dedup] After hash dedup: ${uniqueMessages.length} unique (${duplicatesSkipped} duplicates)`);

    // Check which are already clustered
    const existingHashes = new Set<string>();
    if (uniqueMessages.length > 0) {
      const hashKeys = Array.from(hashMap.keys());
      // Check in batches of 500
      for (let i = 0; i < hashKeys.length; i += 500) {
        const batch = hashKeys.slice(i, i + 500);
        const { data: existing } = await supabase
          .from('semantic_cluster_members')
          .select('message_hash')
          .in('message_hash', batch);
        (existing || []).forEach((e: any) => existingHashes.add(e.message_hash));
      }
    }

    const newMessages = uniqueMessages.filter((_, idx) => {
      const hash = Array.from(hashMap.keys())[idx];
      return !existingHashes.has(hash);
    });

    console.log(`[semantic-dedup] New messages to cluster: ${newMessages.length}`);

    if (newMessages.length === 0) {
      return successResponse({ 
        message: 'All messages already clustered',
        ...emptyResult(),
        duplicatesSkipped,
        uniqueHashes: uniqueMessages.length,
      });
    }

    // ==========================================
    // Step 2: Create embeddings
    // ==========================================
    const embeddings: Array<{ msg: typeof newMessages[0]; embedding: number[]; hash: string }> = [];

    for (let i = 0; i < newMessages.length; i += BATCH_SIZE) {
      const batch = newMessages.slice(i, i + BATCH_SIZE);
      
      for (const msg of batch) {
        try {
          const embedding = await getEmbedding(msg.normalized);
          const hash = await hashText(msg.text);
          embeddings.push({ msg, embedding, hash });
        } catch (err) {
          console.error(`[semantic-dedup] Embedding error:`, err);
        }
      }
      
      // Rate limit protection
      if (i + BATCH_SIZE < newMessages.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    console.log(`[semantic-dedup] Embeddings created: ${embeddings.length}`);

    // ==========================================
    // Step 3: Threshold-based clustering
    // ==========================================
    const clusters: Array<{
      canonical: typeof embeddings[0];
      members: typeof embeddings;
    }> = [];
    const assigned = new Set<number>();

    for (let i = 0; i < embeddings.length; i++) {
      if (assigned.has(i)) continue;

      const cluster = { canonical: embeddings[i], members: [embeddings[i]] };
      assigned.add(i);

      for (let j = i + 1; j < embeddings.length; j++) {
        if (assigned.has(j)) continue;
        
        const sim = cosineSimilarity(embeddings[i].embedding, embeddings[j].embedding);
        if (sim >= SIMILARITY_THRESHOLD) {
          cluster.members.push(embeddings[j]);
          assigned.add(j);
        }
      }

      clusters.push(cluster);
    }

    console.log(`[semantic-dedup] Clusters formed: ${clusters.length} from ${embeddings.length} messages`);

    // ==========================================
    // Step 4: Save clusters to DB
    // ==========================================
    let clustersCreated = 0;

    for (const cluster of clusters) {
      const { data: clusterRow, error: clusterErr } = await supabase
        .from('semantic_clusters')
        .insert({
          organization_id,
          canonical_text: cluster.canonical.msg.text,
          canonical_embedding: `[${cluster.canonical.embedding.join(',')}]`,
          member_count: cluster.members.length,
          avg_similarity: cluster.members.length > 1
            ? cluster.members.slice(1).reduce((sum, m) => 
                sum + cosineSimilarity(cluster.canonical.embedding, m.embedding), 0
              ) / (cluster.members.length - 1)
            : 1.0,
        })
        .select('id')
        .single();

      if (clusterErr) {
        console.error(`[semantic-dedup] Cluster insert error:`, clusterErr);
        continue;
      }

      // Insert members
      const memberRows = cluster.members.map(m => ({
        cluster_id: clusterRow.id,
        organization_id,
        message_text: m.msg.text,
        message_hash: m.hash,
        similarity_score: cosineSimilarity(cluster.canonical.embedding, m.embedding),
        source_type: source === 'chat_messages' ? 'chat' : 'segment',
        source_id: m.msg.id,
      }));

      const { error: memberErr } = await supabase
        .from('semantic_cluster_members')
        .insert(memberRows);

      if (memberErr) {
        console.error(`[semantic-dedup] Members insert error:`, memberErr);
      } else {
        clustersCreated++;
      }
    }

    const result: ClusterResult = {
      clustersCreated,
      messagesProcessed: rawMessages.length,
      uniqueHashes: uniqueMessages.length,
      duplicatesSkipped,
      embeddingsCreated: embeddings.length,
    };

    console.log(`[semantic-dedup] Done:`, result);
    return successResponse(result);

  } catch (error) {
    console.error('[semantic-dedup] Error:', error);
    return errorResponse(error instanceof Error ? error.message : 'Server error', 500);
  }
});

function emptyResult(): ClusterResult {
  return { clustersCreated: 0, messagesProcessed: 0, uniqueHashes: 0, duplicatesSkipped: 0, embeddingsCreated: 0 };
}
