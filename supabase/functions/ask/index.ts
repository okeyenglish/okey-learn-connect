import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, history } = await req.json();
    
    if (!question || typeof question !== "string") {
      return new Response(
        JSON.stringify({ error: "Empty question" }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing question:', question);
    console.log('Conversation history length:', history?.length || 0);

    // Quick handling for greetings and small talk to save tokens and avoid empty answers
    const normalized = (question || '').trim().toLowerCase().replace(/[!.,?]+$/g, '');
    const greetingPhrases = [
      'привет','здравствуйте','добрый день','добрый вечер','доброе утро','hello','hi','добрый ночи','доброй ночи'
    ];
    if (greetingPhrases.some(p => normalized === p || normalized.startsWith(p))) {
      const quickAnswer = "Здравствуйте! Я помощник O'KEY ENGLISH. Чем могу помочь: филиалы, расписание, цены, пробный урок?";
      const response = { answer: quickAnswer, sources: [], showContacts: false };
      return new Response(JSON.stringify(response), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ error: "Missing configuration" }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 1) Get embedding for the question
    console.log('Getting embedding for question...');
    const embRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: question,
      }),
    });

    if (!embRes.ok) {
      const errorText = await embRes.text();
      console.error('Embedding API error:', errorText);
      return new Response(
        JSON.stringify({ error: "Failed to get embeddings", details: errorText }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const embJson = await embRes.json();
    const queryEmbedding = embJson.data?.[0]?.embedding || [];
    console.log('Got embedding, length:', queryEmbedding.length);

    // 2) Vector search using Supabase RPC
    const matchCount = 6;
    console.log('Performing vector search for:', question);
    
    const { data: contexts, error: searchError } = await supabase.rpc('match_docs', {
      query_embedding: queryEmbedding,
      match_count: matchCount
    });

    if (searchError) {
      console.error('Vector search error:', searchError);
      return new Response(
        JSON.stringify({ error: "Search failed", details: searchError.message }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found contexts:', contexts?.length || 0);
    if (contexts && contexts.length > 0) {
      console.log('Top 3 results:');
      contexts.slice(0, 3).forEach((ctx: any, i: number) => {
        console.log(`${i + 1}. ${ctx.title} (similarity: ${ctx.similarity?.toFixed(3)}) - ${ctx.content.substring(0, 100)}...`);
      });
    }

    const siteName = "O'KEY ENGLISH";
    const instruction = `Ты — помощник школы английского языка ${siteName}.

КРИТИЧЕСКИ ВАЖНО: отвечай ТОЛЬКО на основе предоставленных источников.

КОНТЕКСТ РАЗГОВОРА:
- У тебя есть доступ к предыдущим сообщениям в этом диалоге
- Используй контекст для понимания местоимений ("там", "он", "эта школа") и уточняющих вопросов
- Если пользователь спрашивает "А расписание там какое?" после вопроса про филиал — отвечай про расписание этого филиала

ЗАПРЕЩЕНО:
- Выдумывать факты, адреса, цены, скидки
- Перенаправлять к менеджерам, если ответ явно есть в источниках

ОСОБЫЕ ПРАВИЛА ДЛЯ ВОПРОСОВ О ЦЕНАХ/СКИДКАХ:
- Даёшь цифры ТОЛЬКО если в источниках есть явные суммы с валютой (руб, ₽) или проценты
- Если таких данных нет — честно скажи, что актуальные цены уточняются у менеджера, и предложи контакты

ОБЯЗАТЕЛЬНО:
- Отвечай кратко и конкретно, ссылаясь на источники [1], [2]
- Если данных нет — вежливо сообщи об этом и предложи контакты`;

    const contextText = contexts
      ?.map((c: any, i: number) => `[${i + 1}] ${c.title}\n${c.content}\n`)
      .join("\n") || '';

    console.log('Context text length:', contextText.length);
    console.log('Number of contexts:', contexts?.length || 0);

    const hasContexts = !!(contexts && contexts.length > 0);

    // Guard for price questions: never invent numbers
    const qLower = (question || '').toLowerCase();
    const isPriceQuestion = /(цены|стоимост|сколько стоит|прайс|сколько.*руб|сколько.*стоит|тариф|оплат|сколько.*урок)/i.test(qLower);
    const hasPriceData = /\d[\d\s]*(?:руб|₽)/i.test(contextText) || /скидк\w*\s*\d+\s*%/i.test(contextText);

    if (isPriceQuestion && (!hasContexts || !hasPriceData)) {
      const sources = contexts?.map((c: any, i: number) => ({
        idx: i + 1,
        url: c.url,
        title: c.title || c.url,
        similarity: Number(c.similarity?.toFixed?.(3) || 0)
      })) || [];

      const safeAnswer = "Актуальные цены уточняются у менеджера поддержки — пришлём точный расчёт по вашему кейсу. Напишите нам в WhatsApp или Telegram.";
      const response = { answer: safeAnswer, sources, showContacts: true };
      return new Response(JSON.stringify(response), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Build conversation messages including history
    const messages = [
      { role: "system", content: instruction }
    ];

    // Add conversation history (excluding the current question)
    if (history && Array.isArray(history) && history.length > 1) {
      const historyMessages = history.slice(0, -1); // Exclude the current user message
      console.log('Adding history messages:', historyMessages.length);
      
      // Add each message from history
      for (const msg of historyMessages) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        }
      }
    }

    // Add the current question with context
    messages.push({ 
      role: "user", 
      content: hasContexts 
        ? `ВОПРОС: ${question}\n\nИСТОЧНИКИ:\n${contextText}\n\nОТВЕЧАЙ КОНКРЕТНО ИЗ ИСТОЧНИКОВ! Если вопрос про цены и в источниках нет чисел с валютой — скажи, что цены уточняются у менеджера. Укажи номера источников в конце.`
        : `ВОПРОС: ${question}\n\nИсточников нет. Скажи что нужно уточнить у менеджеров.`
    });

    // 3) Generate response using OpenAI (GPT-4.1 mini by default)
    const primaryModel = "gpt-4.1-mini-2025-04-14";
    const fallbackModel = "gpt-4.1-2025-04-14";
    
    console.log('OpenAI request:', {
      model: primaryModel,
      hasContexts,
      contextLength: contextText.length,
      questionLength: question.length
    });

    const makeOpenAIRequest = async (model: string, isRetry = false) => {
      console.log(`Making request to ${model}${isRetry ? ' (retry with stronger model)' : ''}`);
      
      return await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          max_completion_tokens: isRetry ? 1000 : 600,
          temperature: 0.0
        }),
      });
    };

    let chatRes = await makeOpenAIRequest(primaryModel);

    const chatJson = await chatRes.json();
    
    if (!chatRes.ok) {
      console.error('OpenAI chat error:', chatJson);
      return new Response(
        JSON.stringify({ error: "OpenAI error", details: chatJson }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare sources for frontend
    const sources = contexts?.map((c: any, i: number) => ({
      idx: i + 1,
      url: c.url,
      title: c.title || c.url,
      similarity: Number(c.similarity?.toFixed?.(3) || 0)
    })) || [];

    const fallbackText = "Извините, не удалось получить ответ.";

    // Helper: build a deterministic answer from contexts (no AI) when needed
    const buildAnswerFromContexts = (q: string, ctxs: any[] = []) => {
      try {
        if (!ctxs.length) return "";
        const lower = (q || '').toLowerCase();
        const isBranches = /(какие.*филиал|филиал(ы)?|адрес(а|ы)?|где.*наход)/i.test(lower);
        const items = ctxs.map((c: any, i: number) => {
          const title = c.title || `Источник ${i + 1}`;
          const m = (c.content || '').match(/Адрес:\s*([^\n\.]+)/i);
          const address = m?.[1]?.trim();
          return { title, address, idx: i + 1 };
        });

        if (isBranches) {
          const uniq = new Map<string, { title: string; address?: string; idx: number }>();
          for (const it of items) if (!uniq.has(it.title)) uniq.set(it.title, it);
          const list = Array.from(uniq.values())
            .map((it) => `- ${it.title}${it.address ? ` — ${it.address}` : ''} [${it.idx}]`)
            .join('\n');
          return `Наши филиалы:\n${list}`;
        }

        const list = items.slice(0, 5).map((it) => `- ${it.title} [${it.idx}]`).join('\n');
        return `По данным источников:\n${list}`;
      } catch (_) {
        return "";
      }
    };

    let answer = (chatJson.choices?.[0]?.message?.content || '').trim();
    let modelUsed = primaryModel;
    let wasRetried = false;
    
    // Check confidence level and retry with stronger model if needed
    const checkConfidence = (text: string): boolean => {
      const lowConfidenceIndicators = [
        "возможно", "может быть", "вероятно", "скорее всего", "думаю", "полагаю",
        "не уверен", "не совсем понятно", "сложно сказать", "трудно определить",
        "точно не знаю", "информация неполная"
      ];
      const lowerText = text.toLowerCase();
      const indicatorCount = lowConfidenceIndicators.filter(indicator => 
        lowerText.includes(indicator)
      ).length;
      
      return indicatorCount <= 1; // High confidence if <= 1 uncertainty indicator
    };

    // If low confidence detected and we haven't retried yet, try with stronger model
    if (answer && !checkConfidence(answer) && !wasRetried) {
      console.log('Low confidence detected, retrying with stronger model...');
      console.log('Original answer indicators detected:', answer.match(/(возможно|может быть|вероятно|не уверен|сложно сказать)/gi));
      
      try {
        const retryRes = await makeOpenAIRequest(fallbackModel, true);
        const retryJson = await retryRes.json();
        
        if (retryRes.ok && retryJson.choices?.[0]?.message?.content) {
          const retryAnswer = retryJson.choices[0].message.content.trim();
          
          // Use retry answer if it seems more confident
          if (checkConfidence(retryAnswer) || retryAnswer.length > answer.length * 1.1) {
            answer = retryAnswer;
            modelUsed = fallbackModel;
            wasRetried = true;
            console.log('Using stronger model answer due to better confidence');
          } else {
            console.log('Keeping original answer as retry didn\'t improve confidence significantly');
          }
        }
      } catch (retryError) {
        console.warn('Retry with stronger model failed:', retryError);
      }
    }
    
    if (!answer) {
      console.warn('OpenAI returned empty content, constructing answer from contexts.');
      const constructed = buildAnswerFromContexts(question, contexts || []);
      answer = constructed || fallbackText;
    }

    // Sanitize outdated contact handles and remove source references
    const sanitizeResponse = (text: string) => text
      .replace(/t\.me\/okeyenglish_support/gi, 't.me/englishmanager')
      .replace(/@okeyenglish_support/gi, '@englishmanager')
      .replace(/okeyenglish_support/gi, 'englishmanager')
      // Remove source references like [1], [2], [3], etc.
      .replace(/\s*\[\d+\](?:\s*,\s*\[\d+\])*\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    answer = sanitizeResponse(answer);

    console.log(`AI response from ${modelUsed}${wasRetried ? ' (after retry)' : ''}:`, answer);
    console.log('Response length:', answer.length);
    console.log('Confidence level:', checkConfidence(answer) ? 'HIGH' : 'LOW');
    
    // Check if the AI indicates it doesn't know the answer or we used fallback
    const unknownIndicators = [
      "не знаю", "не могу ответить", "не имею информации",
      "недостаточно информации", "нужно уточнить у менеджеров", "не удалось получить ответ"
    ];
    
    const isUnknown = unknownIndicators.some(indicator =>
      answer.toLowerCase().includes(indicator)
    ) || answer === fallbackText;

    const response = {
      answer,
      sources,
      showContacts: isUnknown
    };

    console.log('Response generated successfully');
    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || "Server error" }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});