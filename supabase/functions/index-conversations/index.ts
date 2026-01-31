import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { 
  corsHeaders,
  handleCors, 
  getOpenAIApiKey, 
  getOrganizationIdFromUser,
  errorResponse,
  successResponse
} from '../_shared/types.ts';

interface ConversationAnalysis {
  scenario_type: string;
  client_type: string;
  client_stage: string;
  outcome: string;
  quality_score: number;
  context_summary: string;
  // Новые поля
  intent: string | null;
  issue: string | null;
  confidence_score: number;
  key_phrases: string[];
}

interface ChatMessage {
  id: string;
  message_text: string | null;
  content?: string | null;
  is_outgoing: boolean;
  direction?: string;
  created_at: string;
}

interface IndexRequest {
  clientId?: string;
  daysBack?: number;
  minMessages?: number;
  maxConversations?: number;
  minQuality?: number;
  dryRun?: boolean;
}

interface SkipReasons {
  lowQuality: number;
  ongoing: number;
  analysisFailed: number;
  embeddingFailed: number;
  noMessages: number;
}

async function analyzeConversation(
  messages: ChatMessage[],
  apiKey: string
): Promise<ConversationAnalysis | null> {
  const conversationText = messages
    .map(m => {
      const isOutgoing = m.is_outgoing ?? m.direction === 'outgoing';
      const text = m.message_text ?? m.content ?? '[медиа]';
      return `${isOutgoing ? 'Менеджер' : 'Клиент'}: ${text}`;
    })
    .join('\n');

  const prompt = `Проанализируй диалог менеджера школы/образовательного центра с клиентом и определи параметры в JSON формате.

ДИАЛОГ:
${conversationText}

Верни JSON с полями:
- scenario_type: один из [new_lead, returning, complaint, upsell, reactivation, info_request, scheduling, payment, consultation, objection, enrollment, active_service, renewal, lost_client]
- client_type: один из [parent_child, adult, corporate, student, unknown]
- client_stage: один из [lead, warm, ready_to_pay, active_student, paused, churned, returned]
- outcome: один из [converted, scheduled, resolved, lost, ongoing, paid, retained, satisfied]
- quality_score: число от 1 до 5 (оценка качества работы менеджера)
- context_summary: краткое описание ситуации (1-2 предложения на русском)
- intent: намерение клиента, один из [price_check, schedule_info, program_choice, comparison, hesitation, urgent_start, support_request, upgrade_interest] или null
- issue: проблема/возражение клиента, один из [price_too_high, no_time, child_motivation, teacher_issue, technical_problem, missed_lessons, payment_problem, organization_complaint] или null если нет явного возражения
- confidence_score: число от 0 до 1 - уверенность в классификации (0.9+ для очевидных случаев, 0.7-0.9 для типичных, ниже для неоднозначных)
- key_phrases: массив из 2-4 лучших фраз менеджера которые стоит использовать как пример (только фразы менеджера!)

Критерии оценки quality_score:
5 - Отличная работа: быстрые ответы, конкретные предложения, успешное закрытие, работа с возражениями
4 - Хорошая работа: профессионально, но можно улучшить
3 - Средняя работа: базовые ответы без инициативы
2 - Слабая работа: медленные ответы, упущенные возможности
1 - Плохая работа: грубость, игнорирование вопросов

Определение intent (намерение):
- price_check: клиент спрашивает о стоимости
- schedule_info: клиент интересуется расписанием
- program_choice: клиент выбирает программу/курс
- comparison: клиент сравнивает с конкурентами
- hesitation: клиент сомневается ("надо подумать")
- urgent_start: клиент хочет срочно начать
- support_request: вопрос по текущему обучению
- upgrade_interest: интерес к продвинутым курсам

Определение issue (проблема):
- price_too_high: жалуется на высокую цену
- no_time: нет времени на занятия
- child_motivation: ребёнок не хочет заниматься
- teacher_issue: недоволен преподавателем
- technical_problem: технические проблемы
- missed_lessons: частые пропуски
- payment_problem: проблемы с оплатой
- organization_complaint: жалобы на организацию

Отвечай ТОЛЬКО валидным JSON без markdown.`;

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
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error('[index-conversations] AI analysis failed:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]) as ConversationAnalysis;
  } catch (error) {
    console.error('[index-conversations] Error analyzing conversation:', error);
    return null;
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
        input: text.slice(0, 8000),
      }),
    });

    if (!response.ok) {
      console.error('[index-conversations] Embedding failed:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch (error) {
    console.error('[index-conversations] Error creating embedding:', error);
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
    if (!organizationId) {
      return errorResponse('Organization not found', 400);
    }

    const openaiApiKey = await getOpenAIApiKey(supabase, organizationId);
    if (!openaiApiKey) {
      return errorResponse('AI сервис не настроен. Добавьте OpenAI API ключ в настройках AI.', 500);
    }

    const body = await req.json() as IndexRequest;
    const {
      clientId,
      daysBack = 30,
      minMessages = 5,
      maxConversations = 50,
      minQuality = 3,
      dryRun = false
    } = body;

    console.log(`[index-conversations] Starting: daysBack=${daysBack}, minMessages=${minMessages}, maxConversations=${maxConversations}, minQuality=${minQuality}, dryRun=${dryRun}`);

    let query = supabase
      .from('chat_messages')
      .select('client_id, organization_id')
      .eq('organization_id', organizationId)
      .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString());

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data: messageGroups, error: queryError } = await query;

    if (queryError) {
      console.error('[index-conversations] Query error:', queryError);
      return errorResponse(`Failed to fetch messages: ${queryError.message}`, 500);
    }

    const clientCounts = new Map<string, { count: number; organization_id: string }>();
    for (const msg of messageGroups || []) {
      if (!msg.client_id) continue;
      const existing = clientCounts.get(msg.client_id);
      if (existing) {
        existing.count++;
      } else {
        clientCounts.set(msg.client_id, { count: 1, organization_id: msg.organization_id });
      }
    }

    const eligibleClients = Array.from(clientCounts.entries())
      .filter(([_, data]) => data.count >= minMessages)
      .slice(0, maxConversations);

    console.log(`[index-conversations] Found ${eligibleClients.length} eligible conversations`);

    const skipReasons: SkipReasons = {
      lowQuality: 0,
      ongoing: 0,
      analysisFailed: 0,
      embeddingFailed: 0,
      noMessages: 0,
    };

    const results = {
      total: eligibleClients.length,
      processed: 0,
      indexed: 0,
      skipped: 0,
      errors: 0,
      examples: [] as Array<{
        clientId: string;
        scenario: string;
        quality: number;
        summary: string;
      }>
    };

    for (const [clientIdToProcess, clientData] of eligibleClients) {
      try {
        // Try self-hosted schema first (message_text, is_outgoing)
        let messages: ChatMessage[] | null = null;
        
        const { data: selfHostedMessages, error: selfHostedError } = await supabase
          .from('chat_messages')
          .select('id, message_text, is_outgoing, created_at')
          .eq('client_id', clientIdToProcess)
          .order('created_at', { ascending: true })
          .limit(100);

        if (!selfHostedError && selfHostedMessages?.length) {
          messages = selfHostedMessages;
          console.log(`[index-conversations] Got ${messages.length} messages for ${clientIdToProcess} (self-hosted schema)`);
        } else {
          // Fallback to Lovable Cloud schema (content, direction)
          const { data: cloudMessages, error: cloudError } = await supabase
            .from('chat_messages')
            .select('id, content, direction, created_at')
            .eq('client_id', clientIdToProcess)
            .order('created_at', { ascending: true })
            .limit(100);

          if (!cloudError && cloudMessages?.length) {
            messages = cloudMessages.map(m => ({
              ...m,
              message_text: m.content,
              is_outgoing: m.direction === 'outgoing'
            })) as ChatMessage[];
            console.log(`[index-conversations] Got ${messages.length} messages for ${clientIdToProcess} (cloud schema)`);
          } else {
            console.error(`[index-conversations] Messages error for ${clientIdToProcess}:`, selfHostedError || cloudError);
            skipReasons.noMessages++;
            results.skipped++;
            continue;
          }
        }

        if (!messages?.length) {
          skipReasons.noMessages++;
          results.skipped++;
          continue;
        }

        results.processed++;

        const analysis = await analyzeConversation(messages, openaiApiKey);
        
        if (!analysis) {
          console.log(`[index-conversations] Skipped ${clientIdToProcess}: analysis failed`);
          skipReasons.analysisFailed++;
          results.skipped++;
          continue;
        }

        if (analysis.outcome === 'ongoing') {
          console.log(`[index-conversations] Skipped ${clientIdToProcess}: ongoing conversation`);
          skipReasons.ongoing++;
          results.skipped++;
          continue;
        }

        if (analysis.quality_score < minQuality) {
          console.log(`[index-conversations] Skipped ${clientIdToProcess}: quality=${analysis.quality_score} < ${minQuality}`);
          skipReasons.lowQuality++;
          results.skipped++;
          continue;
        }

        const searchText = `${analysis.scenario_type} ${analysis.client_type} ${analysis.client_stage} ${analysis.context_summary}`;
        const embedding = await createEmbedding(searchText, openaiApiKey);
        
        if (!embedding) {
          console.log(`[index-conversations] Skipped ${clientIdToProcess}: embedding failed`);
          skipReasons.embeddingFailed++;
          results.skipped++;
          continue;
        }

        const messagesJson = messages.map(m => {
          const isOutgoing = m.is_outgoing ?? m.direction === 'outgoing';
          return {
            role: isOutgoing ? 'manager' : 'client',
            content: m.message_text ?? m.content ?? '',
            timestamp: m.created_at
          };
        });

        const firstMsg = messages[0];
        const initialMessage = firstMsg?.message_text ?? firstMsg?.content ?? '';

        if (!dryRun) {
          const { error: insertError } = await supabase
            .from('conversation_examples')
            .insert({
              organization_id: clientData.organization_id,
              scenario_type: analysis.scenario_type,
              client_type: analysis.client_type,
              client_stage: analysis.client_stage,
              context_summary: analysis.context_summary,
              initial_message: initialMessage,
              messages: messagesJson,
              total_messages: messages.length,
              outcome: analysis.outcome,
              quality_score: analysis.quality_score,
              approved: analysis.quality_score >= 4,
              embedding: `[${embedding.join(',')}]`,
              search_text: searchText,
              source_client_id: clientIdToProcess,
              source_messages_ids: messages.map(m => m.id),
              // Новые поля
              intent: analysis.intent || null,
              issue: analysis.issue || null,
              confidence_score: analysis.confidence_score || 0.8,
              key_phrases: analysis.key_phrases || [],
              example_messages: messagesJson // Сохраняем для библиотеки скриптов
            });

          if (insertError) {
            console.error(`[index-conversations] Insert error for ${clientIdToProcess}:`, insertError);
            results.errors++;
            continue;
          }
        }

        results.indexed++;
        results.examples.push({
          clientId: clientIdToProcess,
          scenario: analysis.scenario_type,
          quality: analysis.quality_score,
          summary: analysis.context_summary
        });

        console.log(`[index-conversations] Indexed ${clientIdToProcess}: ${analysis.scenario_type}, quality=${analysis.quality_score}`);

        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`[index-conversations] Error processing ${clientIdToProcess}:`, error);
        results.errors++;
      }
    }

    console.log(`[index-conversations] Complete: ${results.indexed} indexed, ${results.skipped} skipped, ${results.errors} errors`);
    console.log(`[index-conversations] Skip reasons:`, skipReasons);

    return successResponse({
      ...results,
      skipReasons,
      dryRun
    });

  } catch (error) {
    console.error('[index-conversations] Error:', error);
    return errorResponse('Server error', 500);
  }
});
