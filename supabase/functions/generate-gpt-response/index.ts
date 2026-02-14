import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { 
  corsHeaders, 
  successResponse, 
  errorResponse,
  handleCors,
  type AIChatResponse,
} from '../_shared/types.ts';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_MESSAGE_LENGTH = 2000;

const isValidUUID = (str: string): boolean => UUID_REGEX.test(str);

const sanitizeMessage = (msg: string): string => {
  return msg
    .slice(0, MAX_MESSAGE_LENGTH)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .trim();
};

interface GenerateGptRequest {
  clientId: string;
  currentMessage: string;
}

interface ConversationExample {
  id: string;
  scenario_type: string;
  client_type: string;
  context_summary: string;
  messages: Array<{ role: string; content: string }>;
  outcome: string;
  quality_score: number;
  similarity: number;
  // Learning Ranker fields
  usage_count?: number;
  feedback_score?: number;
  success_rate?: number;
  final_score?: number;
  memory_tier?: string;
  freshness_score?: number;
}

async function verifyClientAccess(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  clientId: string
): Promise<{ hasAccess: boolean; organizationId?: string; error?: string }> {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile?.organization_id) {
      return { hasAccess: false, error: 'User profile not found' };
    }

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, organization_id')
      .eq('id', clientId)
      .maybeSingle();

    if (clientError || !client) {
      return { hasAccess: false, error: 'Client not found' };
    }

    if (client.organization_id !== profile.organization_id) {
      return { hasAccess: false, error: 'Client not in your organization' };
    }

    return { hasAccess: true, organizationId: profile.organization_id };
  } catch (error) {
    return { hasAccess: false, error: 'Access verification failed' };
  }
}

async function analyzeContext(
  messages: Array<{ message_text: string; is_outgoing: boolean }>,
  currentMessage: string,
  apiKey: string
): Promise<{ scenario_type: string; client_type: string; client_stage: string } | null> {
  const conversationText = messages
    .slice(-5)
    .map(m => `${m.is_outgoing ? 'Менеджер' : 'Клиент'}: ${m.message_text}`)
    .join('\n');

  const prompt = `Определи контекст диалога. Отвечай ТОЛЬКО JSON без markdown.

Последние сообщения:
${conversationText}

Текущее сообщение клиента: ${currentMessage}

JSON формат:
{
  "scenario_type": "new_lead|returning|complaint|upsell|reactivation|info_request|scheduling|payment",
  "client_type": "parent_child|adult|corporate|student|unknown",
  "client_stage": "cold|warm|hot|active|churned"
}`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 150,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

async function createEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
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

// Learning Ranker: re-score and sort examples by effectiveness
function rankExamples(examples: ConversationExample[], similarity: number[]): ConversationExample[] {
  return examples
    .map((ex, i) => ({
      ...ex,
      _rankerScore: (
        0.35 * (similarity[i] || ex.similarity || 0) +
        0.25 * Math.min((ex.feedback_score || 0) / 10, 1) +
        0.20 * (ex.success_rate || 0) +
        0.10 * Math.min((ex.usage_count || 0) / 20, 1) +
        0.10 * (ex.freshness_score || 1)
      )
    }))
    .sort((a, b) => (b as any)._rankerScore - (a as any)._rankerScore);
}

function formatExamples(examples: ConversationExample[]): string {
  if (!examples.length) return '';

  return examples.map((ex, i) => {
    const dialog = (ex.messages || [])
      .slice(0, 6)
      .map(m => `  ${m.role === 'manager' ? 'Менеджер' : 'Клиент'}: ${m.content}`)
      .join('\n');

    return `--- Пример ${i + 1} (${ex.scenario_type}, качество: ${ex.quality_score}/5) ---
Ситуация: ${ex.context_summary}
Диалог:
${dialog}
Результат: ${ex.outcome}`;
  }).join('\n\n');
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Unauthorized: Missing authorization header', 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims?.sub) {
      return errorResponse('Unauthorized: Invalid token', 401);
    }

    const userId = claimsData.claims.sub;
    const body = await req.json() as GenerateGptRequest;
    const { clientId, currentMessage } = body;
    
    if (!clientId || !isValidUUID(clientId)) {
      return errorResponse('Invalid client ID', 400);
    }
    
    if (!currentMessage || typeof currentMessage !== 'string') {
      return errorResponse('Message is required', 400);
    }
    
    const sanitizedMessage = sanitizeMessage(currentMessage);
    if (sanitizedMessage.length === 0) {
      return errorResponse('Message cannot be empty', 400);
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return errorResponse('Service configuration error', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const accessCheck = await verifyClientAccess(supabase, userId, clientId);
    if (!accessCheck.hasAccess) {
      return errorResponse(accessCheck.error || 'Access denied', 403);
    }

    const organizationId = accessCheck.organizationId;

    // Get recent messages + client info in parallel
    const [messagesRes, clientRes] = await Promise.all([
      supabase
        .from('chat_messages')
        .select('content, direction, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('clients')
        .select('name, notes, status')
        .eq('id', clientId)
        .maybeSingle()
    ]);

    const formattedMessages = (messagesRes.data || []).map(m => ({
      message_text: m.content || '',
      is_outgoing: m.direction === 'outgoing',
      created_at: m.created_at
    }));

    const client = clientRes.data;

    let conversationContext = '';
    if (formattedMessages.length > 0) {
      conversationContext = formattedMessages
        .reverse()
        .map(msg => `${msg.is_outgoing ? 'Менеджер' : 'Клиент'}: ${msg.message_text}`)
        .join('\n');
    }

    // === RAG with Learning Ranker ===
    let similarExamples: ConversationExample[] = [];
    let editedExamples: Array<{ edited_response: string; client_message: string; similarity: number }> = [];
    let contextAnalysis: { scenario_type: string; client_type: string; client_stage: string } | null = null;
    const usedExampleIds: string[] = [];

    try {
      contextAnalysis = await analyzeContext(formattedMessages, sanitizedMessage, LOVABLE_API_KEY);
      console.log('Context analysis:', contextAnalysis);

      if (contextAnalysis) {
        const searchText = `${contextAnalysis.scenario_type} ${contextAnalysis.client_type} ${sanitizedMessage}`;
        const embedding = await createEmbedding(searchText, LOVABLE_API_KEY);

        if (embedding) {
          // Parallel search: conversation examples (working memory first) + edited examples + segments
          const embeddingStr = `[${embedding.join(',')}]`;
          
          const [examplesRes, editedRes, segmentsRes] = await Promise.all([
            supabase.rpc('match_conversations', {
              query_embedding: embeddingStr,
              p_scenario_type: contextAnalysis.scenario_type,
              match_count: 8 // fetch more, ranker will select best
            }).catch(() => ({ data: null, error: null })),
            supabase.rpc('match_edited_examples', {
              query_embedding: embeddingStr,
              p_organization_id: organizationId || null,
              match_count: 3
            }).catch(() => ({ data: null, error: null })),
            supabase.rpc('match_segments', {
              query_embedding: embeddingStr,
              p_organization_id: organizationId || null,
              p_intent_type: null,
              match_count: 5
            }).catch(() => ({ data: null, error: null }))
          ]);

          // Apply Learning Ranker to conversation examples
          if (examplesRes.data?.length) {
            const similarities = examplesRes.data.map((ex: any) => ex.similarity || 0);
            const ranked = rankExamples(examplesRes.data, similarities);
            
            // Prefer working memory, then longterm
            const working = ranked.filter(ex => ex.memory_tier === 'working');
            const longterm = ranked.filter(ex => ex.memory_tier === 'longterm');
            const rest = ranked.filter(ex => ex.memory_tier !== 'working' && ex.memory_tier !== 'longterm');
            
            similarExamples = [...working, ...longterm, ...rest].slice(0, 3);
            
            // Track usage
            for (const ex of similarExamples) {
              if (ex.id) {
                usedExampleIds.push(ex.id);
              }
            }
            
            console.log(`Learning Ranker: ${ranked.length} candidates → ${similarExamples.length} selected (${working.length} working, ${longterm.length} longterm)`);
          }

          // Edited examples (highest quality — human-corrected)
          if (editedRes.data?.length) {
            editedExamples = editedRes.data.filter((ex: any) => ex.similarity >= 0.4);
            console.log(`Found ${editedExamples.length} relevant edited examples`);
          }

          // Segments as additional context
          if (segmentsRes.data?.length) {
            const relevantSegments = segmentsRes.data.filter((s: any) => s.similarity >= 0.5);
            console.log(`Found ${relevantSegments.length} relevant segments`);
          }
        }
      }
    } catch (ragError) {
      console.warn('RAG search failed:', ragError);
    }

    // Track example usage asynchronously
    if (usedExampleIds.length > 0) {
      Promise.all(
        usedExampleIds.map(id => supabase.rpc('track_example_usage', { p_example_id: id }))
      ).catch(err => console.warn('Failed to track usage:', err));
    }

    // === Build enhanced system prompt ===
    let systemPrompt = `Вы профессиональный менеджер английской школы "O'KEY ENGLISH". 
Ваша задача - сгенерировать подходящий ответ клиенту на основе контекста диалога.

Информация о клиенте: ${client?.name || 'Не указано'}
Статус клиента: ${client?.status || 'Не указан'}
Заметки о клиенте: ${client?.notes || 'Нет заметок'}`;

    if (contextAnalysis) {
      systemPrompt += `

АНАЛИЗ ТЕКУЩЕЙ СИТУАЦИИ:
- Тип сценария: ${contextAnalysis.scenario_type}
- Тип клиента: ${contextAnalysis.client_type}
- Стадия клиента: ${contextAnalysis.client_stage}`;
    }

    // Edited examples have highest priority (human-corrected)
    if (editedExamples.length > 0) {
      systemPrompt += `

ЛУЧШИЕ ОТВЕТЫ (исправленные менеджерами — высший приоритет):
${editedExamples.map((ex, i) => 
  `[Исправление ${i + 1}] Клиент: ${ex.client_message || '...'}\nЛучший ответ: ${ex.edited_response}`
).join('\n\n')}

Используй стиль и формулировки из этих исправлений — они доказали эффективность.`;
    }

    // Conversation examples (ranked by Learning Ranker)
    if (similarExamples.length > 0) {
      systemPrompt += `

ПРИМЕРЫ УСПЕШНЫХ ДИАЛОГОВ В ПОХОЖИХ СИТУАЦИЯХ:
${formatExamples(similarExamples)}

Используй стиль и подход из этих примеров при составлении ответа.`;
    }

    systemPrompt += `

Контекст предыдущих сообщений:
${conversationContext}

Текущее сообщение клиента: ${sanitizedMessage}

ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА:
1. Вы менеджер школы английского языка O'KEY ENGLISH - общайтесь профессионально на "Вы"
2. НЕ комментируйте факт получения голосовых сообщений/изображений - отвечайте на содержание
3. Предлагайте конкретные программы: Kids Box (3-12 лет), Prepare (12-17 лет), Super Safari (3-6 лет), Empower (взрослые)
4. Обязательно упоминайте возможность бесплатного пробного занятия
5. Предлагайте связаться по телефону для консультации или встретиться в филиале
6. Отвечайте кратко и по делу (максимум 150 слов)
7. НЕ используйте фразы типа "Вы отправили сообщение/изображение" - отвечайте на суть
8. Всегда обращайтесь на "Вы"

Сгенерируйте ответ, который:
- Отвечает на конкретный вопрос или потребность клиента
- Предлагает подходящее решение из услуг школы
- Звучит естественно и профессионально
- Мотивирует к действию (запись на урок, консультация и т.д.)

Отвечайте только текстом ответа, без дополнительных пояснений.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: sanitizedMessage }
        ],
        max_completion_tokens: 300,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', errorText);
      
      if (aiResponse.status === 429) {
        return errorResponse('Превышен лимит запросов к AI. Попробуйте позже.', 429);
      } else if (aiResponse.status === 402) {
        return errorResponse('Недостаточно средств на балансе Lovable AI.', 402);
      }
      
      return errorResponse('AI service error', 500);
    }

    const data = await aiResponse.json();
    const generatedText = data.choices[0].message.content;

    const result: AIChatResponse = { 
      success: true, 
      response: generatedText 
    };

    return successResponse({ 
      ...result, 
      generatedText,
      usedExamples: similarExamples.length,
      usedEditedExamples: editedExamples.length,
      usedExampleIds,
      scenarioType: contextAnalysis?.scenario_type 
    });

  } catch (error: unknown) {
    console.error('Error in generate-gpt-response function:', error);
    return errorResponse('Server error', 500);
  }
});
