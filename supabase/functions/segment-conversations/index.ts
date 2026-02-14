import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { 
  corsHeaders, 
  handleCors,
  errorResponse,
  successResponse,
  getOrganizationIdFromUser
} from '../_shared/types.ts';
import { routeModelRequest, getEmbedding, hashText, normalizeTextForHash } from '../_shared/model-router.ts';

/**
 * Segments indexed conversations into Q/A intent pairs
 * for granular vector retrieval (conversation_segments table).
 * 
 * Optimized with:
 * - Model Router (cheap tier for batch segmentation)
 * - Intent Cache (skip already-seen texts)
 * - Lovable AI Gateway (no OpenAI key needed)
 */

interface Segment {
  intent_type: string;
  client_text: string;
  manager_reply: string;
}

async function segmentConversation(
  messages: Array<{ role: string; content: string }>,
): Promise<Segment[]> {
  const dialog = messages
    .map(m => `${m.role === 'manager' ? 'Менеджер' : 'Клиент'}: ${m.content}`)
    .join('\n');

  const prompt = `Разбей диалог на отдельные Q/A сегменты (вопрос клиента + ответ менеджера).

ДИАЛОГ:
${dialog}

Верни JSON массив сегментов:
[{
  "intent_type": "price_check|schedule_info|program_choice|objection_handling|booking|trial_lesson|location|payment|complaint|general_info",
  "client_text": "текст вопроса/реплики клиента",
  "manager_reply": "текст ответа менеджера"
}]

Правила:
- Каждый сегмент = 1 тема/намерение
- Объединяй несколько сообщений одной темы в один сегмент
- Пропускай приветствия и прощания без содержания
- Отвечай ТОЛЬКО JSON без markdown`;

  try {
    const result = await routeModelRequest({
      task: 'batch_segmentation',
      messages: [{ role: 'user', content: prompt }],
      overrideMaxTokens: 1000,
    });

    const content = result.content;
    if (!content) return [];

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('[segment] LLM error:', err);
    return [];
  }
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Unauthorized', 401);
    }

    const selfHostedUrl = Deno.env.get('SELF_HOSTED_URL') || Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(selfHostedUrl, supabaseServiceKey);

    const organizationId = await getOrganizationIdFromUser(supabase, authHeader);
    if (!organizationId) return errorResponse('Organization not found', 400);

    const { maxExamples = 50, onlyUnsegmented = true } = await req.json().catch(() => ({}));

    // Get conversation examples that need segmentation
    const query = supabase
      .from('conversation_examples')
      .select('id, organization_id, messages, example_messages, quality_score')
      .eq('organization_id', organizationId)
      .gte('quality_score', 3)
      .order('quality_score', { ascending: false })
      .limit(maxExamples);

    const { data: examples, error: fetchError } = await query;

    if (fetchError) return errorResponse(fetchError.message, 500);
    if (!examples?.length) return successResponse({ segmented: 0, message: 'No examples to segment' });

    // Filter out already segmented if needed
    let toProcess = examples;
    if (onlyUnsegmented) {
      const { data: existing } = await supabase
        .from('conversation_segments')
        .select('conversation_example_id')
        .in('conversation_example_id', examples.map((e: any) => e.id));

      const segmentedSet = new Set((existing || []).map((s: any) => s.conversation_example_id));
      toProcess = examples.filter((e: any) => !segmentedSet.has(e.id));
    }

    console.log(`[segment] Processing ${toProcess.length} conversations via Model Router (cheap tier)`);

    let totalSegments = 0;
    let errors = 0;
    let cacheHits = 0;

    for (const example of toProcess) {
      try {
        const msgs = example.example_messages || example.messages || [];
        if (msgs.length < 3) continue;

        const segments = await segmentConversation(msgs);
        if (!segments.length) continue;

        // Create embeddings and insert segments
        for (const seg of segments) {
          // Check intent cache first
          const segHash = await hashText(seg.client_text);
          const { data: cached } = await supabase
            .rpc('lookup_intent_cache', {
              p_organization_id: organizationId,
              p_text: seg.client_text,
            });

          if (cached?.[0]?.cache_hit) {
            cacheHits++;
          }

          // Always create embedding for the segment
          let embedding: number[] | null = null;
          try {
            const embText = `${seg.intent_type} ${seg.client_text}`;
            embedding = await getEmbedding(embText);
          } catch {
            // embedding failure is non-critical
          }

          const { error: insertError } = await supabase
            .from('conversation_segments')
            .insert({
              conversation_example_id: example.id,
              organization_id: example.organization_id,
              intent_type: seg.intent_type,
              client_text: seg.client_text,
              manager_reply: seg.manager_reply,
              embedding: embedding ? `[${embedding.join(',')}]` : null,
              quality_score: example.quality_score,
            });

          if (insertError) {
            console.error(`[segment] Insert error:`, insertError);
            errors++;
          } else {
            totalSegments++;
            // Cache the intent
            await supabase.rpc('upsert_intent_cache', {
              p_organization_id: organizationId,
              p_text: seg.client_text,
              p_intent: seg.intent_type,
              p_model: 'gemini-flash-lite',
            }).catch(() => {}); // non-critical
          }
        }

        await new Promise(r => setTimeout(r, 300)); // reduced from 500ms
      } catch (err) {
        console.error(`[segment] Error for ${example.id}:`, err);
        errors++;
      }
    }

    console.log(`[segment] Done: ${totalSegments} segments, ${errors} errors, ${cacheHits} cache hits`);
    return successResponse({ segmented: totalSegments, processed: toProcess.length, errors, cacheHits });

  } catch (error) {
    console.error('[segment] Error:', error);
    return errorResponse('Server error', 500);
  }
});
