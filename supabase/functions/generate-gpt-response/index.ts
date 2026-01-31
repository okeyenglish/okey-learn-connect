import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { 
  corsHeaders, 
  successResponse, 
  errorResponse,
  getErrorMessage,
  handleCors,
  type AIChatResponse,
} from '../_shared/types.ts';

// Input validation constants
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_MESSAGE_LENGTH = 2000;

// Validate UUID format
const isValidUUID = (str: string): boolean => UUID_REGEX.test(str);

// Sanitize message - remove potential injection patterns but keep content
const sanitizeMessage = (msg: string): string => {
  return msg
    .slice(0, MAX_MESSAGE_LENGTH)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags
    .trim();
};

interface GenerateGptRequest {
  clientId: string;
  currentMessage: string;
}

interface ConversationExample {
  scenario_type: string;
  client_type: string;
  context_summary: string;
  messages: Array<{ role: string; content: string }>;
  outcome: string;
  quality_score: number;
  similarity: number;
}

// Verify user has access to the client via organization
async function verifyClientAccess(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  clientId: string
): Promise<{ hasAccess: boolean; error?: string }> {
  try {
    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile?.organization_id) {
      console.error('Profile fetch error:', profileError);
      return { hasAccess: false, error: 'User profile not found' };
    }

    // Check if client belongs to user's organization
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, organization_id')
      .eq('id', clientId)
      .maybeSingle();

    if (clientError) {
      console.error('Client fetch error:', clientError);
      return { hasAccess: false, error: 'Failed to verify client access' };
    }

    if (!client) {
      return { hasAccess: false, error: 'Client not found' };
    }

    if (client.organization_id !== profile.organization_id) {
      console.warn(`Access denied: client org ${client.organization_id} != user org ${profile.organization_id}`);
      return { hasAccess: false, error: 'Client not in your organization' };
    }

    return { hasAccess: true };
  } catch (error) {
    console.error('Access verification error:', error);
    return { hasAccess: false, error: 'Access verification failed' };
  }
}

// Analyze current conversation context
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

// Create embedding for similarity search
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

// Format example conversations for the prompt
function formatExamples(examples: ConversationExample[]): string {
  if (!examples.length) return '';

  return examples.map((ex, i) => {
    const dialog = ex.messages
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
    // Verify JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Unauthorized: Missing authorization header', 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create client with user's token for authentication
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims?.sub) {
      console.error('JWT verification failed:', claimsError);
      return errorResponse('Unauthorized: Invalid token', 401);
    }

    const userId = claimsData.claims.sub;
    console.log(`Authenticated user: ${userId}`);

    const body = await req.json() as GenerateGptRequest;
    const { clientId, currentMessage } = body;
    
    // Validate clientId
    if (!clientId || typeof clientId !== 'string') {
      return errorResponse('Client ID is required', 400);
    }
    
    if (!isValidUUID(clientId)) {
      return errorResponse('Invalid client ID format', 400);
    }
    
    // Validate currentMessage
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

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user has access to this client
    const accessCheck = await verifyClientAccess(supabase, userId, clientId);
    if (!accessCheck.hasAccess) {
      console.warn(`Access denied for user ${userId} to client ${clientId}: ${accessCheck.error}`);
      return errorResponse(accessCheck.error || 'Access denied', 403);
    }

    // Get recent chat messages for context
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('content, direction, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
    }

    // Transform messages to expected format
    const formattedMessages = (messages || []).map(m => ({
      message_text: m.content || '',
      is_outgoing: m.direction === 'outgoing',
      created_at: m.created_at
    }));

    // Get client info for additional context
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('name, notes, status')
      .eq('id', clientId)
      .maybeSingle();

    if (clientError) {
      console.error('Error fetching client:', clientError);
    }

    // Build conversation context
    let conversationContext = '';
    if (formattedMessages.length > 0) {
      conversationContext = formattedMessages
        .reverse()
        .map(msg => `${msg.is_outgoing ? 'Менеджер' : 'Клиент'}: ${msg.message_text}`)
        .join('\n');
    }

    // === RAG: Find similar conversation examples ===
    let similarExamples: ConversationExample[] = [];
    let contextAnalysis: { scenario_type: string; client_type: string; client_stage: string } | null = null;

    try {
      // Analyze current context
      contextAnalysis = await analyzeContext(formattedMessages, sanitizedMessage, LOVABLE_API_KEY);
      console.log('Context analysis:', contextAnalysis);

      if (contextAnalysis) {
        // Create embedding for current situation
        const searchText = `${contextAnalysis.scenario_type} ${contextAnalysis.client_type} ${sanitizedMessage}`;
        const embedding = await createEmbedding(searchText, LOVABLE_API_KEY);

        if (embedding) {
          // Search for similar approved examples
          const { data: examples, error: examplesError } = await supabase
            .rpc('match_conversations', {
              query_embedding: `[${embedding.join(',')}]`,
              p_scenario_type: contextAnalysis.scenario_type,
              match_count: 3
            });

          if (!examplesError && examples?.length) {
            similarExamples = examples;
            console.log(`Found ${similarExamples.length} similar conversation examples`);
          }
        }
      }
    } catch (ragError) {
      console.warn('RAG search failed, falling back to basic prompt:', ragError);
    }

    // === Build enhanced system prompt ===
    let systemPrompt = `Вы профессиональный менеджер английской школы "O'KEY ENGLISH". 
Ваша задача - сгенерировать подходящий ответ клиенту на основе контекста диалога.

Информация о клиенте: ${client?.name || 'Не указано'}
Статус клиента: ${client?.status || 'Не указан'}
Заметки о клиенте: ${client?.notes || 'Нет заметок'}`;

    // Add context analysis if available
    if (contextAnalysis) {
      systemPrompt += `

АНАЛИЗ ТЕКУЩЕЙ СИТУАЦИИ:
- Тип сценария: ${contextAnalysis.scenario_type}
- Тип клиента: ${contextAnalysis.client_type}
- Стадия клиента: ${contextAnalysis.client_stage}`;
    }

    // Add similar examples if found (few-shot learning)
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
      scenarioType: contextAnalysis?.scenario_type 
    });

  } catch (error: unknown) {
    console.error('Error in generate-gpt-response function:', error);
    return errorResponse('Server error', 500);
  }
});
