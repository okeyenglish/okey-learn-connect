import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { 
  corsHeaders, 
  handleCors,
  errorResponse,
  successResponse,
  getOpenAIApiKey,
  getOrganizationIdFromUser
} from '../_shared/types.ts';

/**
 * Segments indexed conversations into Q/A intent pairs
 * for granular vector retrieval (conversation_segments table).
 */

interface Segment {
  intent_type: string;
  client_text: string;
  manager_reply: string;
}

async function segmentConversation(
  messages: Array<{ role: string; content: string }>,
  apiKey: string
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
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) return [];
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return [];

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    return JSON.parse(jsonMatch[0]);
  } catch {
    return [];
  }
}

async function createEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.slice(0, 2000),
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch {
    return null;
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const organizationId = await getOrganizationIdFromUser(supabase, authHeader);
    if (!organizationId) return errorResponse('Organization not found', 400);

    const openaiApiKey = await getOpenAIApiKey(supabase, organizationId);
    if (!openaiApiKey) return errorResponse('AI not configured', 500);

    const { maxExamples = 50, onlyUnsegmented = true } = await req.json().catch(() => ({}));

    // Get conversation examples that need segmentation
    let query = supabase
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
        .in('conversation_example_id', examples.map(e => e.id));

      const segmentedSet = new Set((existing || []).map(s => s.conversation_example_id));
      toProcess = examples.filter(e => !segmentedSet.has(e.id));
    }

    console.log(`[segment] Processing ${toProcess.length} conversations`);

    let totalSegments = 0;
    let errors = 0;

    for (const example of toProcess) {
      try {
        const msgs = example.example_messages || example.messages || [];
        if (msgs.length < 3) continue;

        const segments = await segmentConversation(msgs, openaiApiKey);
        if (!segments.length) continue;

        // Create embeddings and insert segments
        for (const seg of segments) {
          const embText = `${seg.intent_type} ${seg.client_text}`;
          const embedding = await createEmbedding(embText, openaiApiKey);

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
          }
        }

        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.error(`[segment] Error for ${example.id}:`, err);
        errors++;
      }
    }

    console.log(`[segment] Done: ${totalSegments} segments, ${errors} errors`);
    return successResponse({ segmented: totalSegments, processed: toProcess.length, errors });

  } catch (error) {
    console.error('[segment] Error:', error);
    return errorResponse('Server error', 500);
  }
});
