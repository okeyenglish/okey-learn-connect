import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { 
  corsHeaders, 
  successResponse, 
  errorResponse,
  getErrorMessage,
  handleCors,
  type AIChatRequest,
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

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get recent chat messages for context
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('message_text, is_outgoing, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
    }

    // Get client info for additional context
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('name, notes')
      .eq('id', clientId)
      .single();

    if (clientError) {
      console.error('Error fetching client:', clientError);
    }

    // Build conversation context
    let conversationContext = '';
    if (messages && messages.length > 0) {
      conversationContext = messages
        .reverse()
        .map(msg => `${msg.is_outgoing ? 'Менеджер' : 'Клиент'}: ${msg.message_text}`)
        .join('\n');
    }

    const systemPrompt = `Вы профессиональный менеджер английской школы "O'KEY ENGLISH". 
Ваша задача - сгенерировать подходящий ответ клиенту на основе контекста диалога.

Информация о клиенте: ${client?.name || 'Не указано'}
Заметки о клиенте: ${client?.notes || 'Нет заметок'}

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
      
      return errorResponse(`AI Gateway error: ${errorText}`, 500);
    }

    const data = await aiResponse.json();
    const generatedText = data.choices[0].message.content;

    const result: AIChatResponse = { 
      success: true, 
      response: generatedText 
    };

    return successResponse({ ...result, generatedText });

  } catch (error: unknown) {
    console.error('Error in generate-gpt-response function:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});
