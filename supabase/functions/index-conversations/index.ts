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
}

interface ChatMessage {
  id: string;
  content: string;
  direction: string;
  created_at: string;
  sender_name?: string;
}

interface IndexRequest {
  clientId?: string;
  daysBack?: number;
  minMessages?: number;
  maxConversations?: number;
  dryRun?: boolean;
}

// Analyze conversation using AI to determine scenario, type, quality
async function analyzeConversation(
  messages: ChatMessage[],
  apiKey: string
): Promise<ConversationAnalysis | null> {
  const conversationText = messages
    .map(m => `${m.direction === 'outgoing' ? 'Менеджер' : 'Клиент'}: ${m.content || '[медиа]'}`)
    .join('\n');

  const prompt = `Проанализируй диалог менеджера школы английского языка с клиентом и определи параметры в JSON формате.

ДИАЛОГ:
${conversationText}

Верни JSON с полями:
- scenario_type: один из [new_lead, returning, complaint, upsell, reactivation, info_request, scheduling, payment]
- client_type: один из [parent_child, adult, corporate, student, unknown]
- client_stage: один из [cold, warm, hot, active, churned]
- outcome: один из [converted, scheduled, resolved, lost, ongoing]
- quality_score: число от 1 до 5 (оценка качества работы менеджера)
- context_summary: краткое описание ситуации (1-2 предложения на русском)

Критерии оценки quality_score:
5 - Отличная работа: быстрые ответы, конкретные предложения, успешное закрытие
4 - Хорошая работа: профессионально, но можно улучшить
3 - Средняя работа: базовые ответы без инициативы
2 - Слабая работа: медленные ответы, упущенные возможности
1 - Плохая работа: грубость, игнорирование вопросов

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
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error('AI analysis failed:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) return null;

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]) as ConversationAnalysis;
  } catch (error) {
    console.error('Error analyzing conversation:', error);
    return null;
  }
}

// Create embedding for the conversation
async function createEmbedding(
  text: string,
  apiKey: string
): Promise<number[] | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000), // Limit text length
      }),
    });

    if (!response.ok) {
      console.error('Embedding failed:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch (error) {
    console.error('Error creating embedding:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS
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

    // Get organization ID from auth header
    const organizationId = await getOrganizationIdFromUser(supabase, authHeader);
    if (!organizationId) {
      return errorResponse('Organization not found', 400);
    }

    // Get OpenAI API key from organization settings
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
      dryRun = false
    } = body;

    console.log(`[index-conversations] Starting: daysBack=${daysBack}, minMessages=${minMessages}, maxConversations=${maxConversations}, dryRun=${dryRun}`);

    // Get conversations to index
    let query = supabase
      .from('chat_messages')
      .select('client_id, organization_id')
      .eq('organization_id', organizationId)
      .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
      .not('content', 'is', null);

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data: messageGroups, error: queryError } = await query;

    if (queryError) {
      console.error('[index-conversations] Query error:', queryError);
      return errorResponse('Failed to fetch messages', 500);
    }

    // Group by client_id and count messages
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

    // Filter clients with enough messages
    const eligibleClients = Array.from(clientCounts.entries())
      .filter(([_, data]) => data.count >= minMessages)
      .slice(0, maxConversations);

    console.log(`[index-conversations] Found ${eligibleClients.length} eligible conversations`);

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
        // Fetch full conversation
        const { data: messages, error: messagesError } = await supabase
          .from('chat_messages')
          .select('id, content, direction, created_at, sender_name')
          .eq('client_id', clientIdToProcess)
          .order('created_at', { ascending: true })
          .limit(100);

        if (messagesError || !messages?.length) {
          results.skipped++;
          continue;
        }

        results.processed++;

        // Analyze conversation
        const analysis = await analyzeConversation(messages, openaiApiKey);
        
        if (!analysis) {
          console.log(`[index-conversations] Skipped ${clientIdToProcess}: analysis failed`);
          results.skipped++;
          continue;
        }

        // Skip low quality or ongoing conversations
        if (analysis.quality_score < 3 || analysis.outcome === 'ongoing') {
          console.log(`[index-conversations] Skipped ${clientIdToProcess}: quality=${analysis.quality_score}, outcome=${analysis.outcome}`);
          results.skipped++;
          continue;
        }

        // Create search text for embedding
        const searchText = `${analysis.scenario_type} ${analysis.client_type} ${analysis.client_stage} ${analysis.context_summary}`;
        
        // Create embedding
        const embedding = await createEmbedding(searchText, openaiApiKey);
        
        if (!embedding) {
          console.log(`[index-conversations] Skipped ${clientIdToProcess}: embedding failed`);
          results.skipped++;
          continue;
        }

        // Prepare messages JSON
        const messagesJson = messages.map(m => ({
          role: m.direction === 'outgoing' ? 'manager' : 'client',
          content: m.content || '',
          timestamp: m.created_at
        }));

        if (!dryRun) {
          // Save to conversation_examples
          const { error: insertError } = await supabase
            .from('conversation_examples')
            .insert({
              organization_id: clientData.organization_id,
              scenario_type: analysis.scenario_type,
              client_type: analysis.client_type,
              client_stage: analysis.client_stage,
              context_summary: analysis.context_summary,
              initial_message: messages[0]?.content || '',
              messages: messagesJson,
              total_messages: messages.length,
              outcome: analysis.outcome,
              quality_score: analysis.quality_score,
              approved: analysis.quality_score >= 4,
              embedding: `[${embedding.join(',')}]`,
              search_text: searchText,
              source_client_id: clientIdToProcess,
              source_messages_ids: messages.map(m => m.id)
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

        // Rate limiting - avoid hitting API limits
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`[index-conversations] Error processing ${clientIdToProcess}:`, error);
        results.errors++;
      }
    }

    console.log(`[index-conversations] Complete: ${results.indexed} indexed, ${results.skipped} skipped, ${results.errors} errors`);

    return successResponse({
      ...results,
      dryRun
    });

  } catch (error) {
    console.error('[index-conversations] Error:', error);
    return errorResponse('Server error', 500);
  }
});
