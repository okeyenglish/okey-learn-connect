import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, currentMessage } = await req.json();
    
    if (!clientId || !currentMessage) {
      throw new Error('Client ID and current message are required');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not set');
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

Текущее сообщение клиента: ${currentMessage}

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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: currentMessage }
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content;

    return new Response(JSON.stringify({ generatedText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-gpt-response function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});