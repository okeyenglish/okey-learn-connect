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
    const { question } = await req.json();
    
    if (!question || typeof question !== "string") {
      return new Response(
        JSON.stringify({ error: "Empty question" }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing question:', question);

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

    // Quick intents: branches addresses and pricing
    const branchQuick = [
      { key: 'котельник', title: "Филиал в Котельниках", url: '/branches/kotelniki', address: 'ул. Новая, 6' },
      { key: 'новокосин', title: "Филиал в Новокосино", url: '/branches/novokosino', address: 'Суздальская ул., 18к1' },
      { key: 'окск', title: "Филиал на Окской", url: '/branches/okskaya', address: 'Окская ул., 5' },
      { key: 'стахановск', title: "Филиал на Стахановской", url: '/branches/stakhanovskaya', address: 'ул. Стахановская, 24' },
      { key: 'солнцев', title: "Филиал в Солнцево", url: '/branches/solntsevo', address: 'Солнцевский пр-т, 25' },
      { key: 'мытищ', title: "Филиал в Мытищах", url: '/branches/mytishchi', address: 'ул. Мира, 2/22' },
      { key: 'люберц', title: "Филиал Люберцы-1", url: '/branches/lyubertsy-1', address: 'Октябрьский проспект, 151' },
      { key: 'красн', title: "Филиал Люберцы-2 (Красная горка)", url: '/branches/lyubertsy-2', address: 'ул. 3-е Почтовое отделение, 90' },
      { key: 'онлайн', title: "Онлайн обучение", url: '/branches/online', address: 'онлайн-формат (без адреса)' },
    ];

    const mentionsAddress = normalized.includes('адрес') || normalized.includes('где') || normalized.includes('как добраться');
    const branchHit = branchQuick.find(b => normalized.includes(b.key));
    if (branchHit && (mentionsAddress || normalized.includes('филиал') || normalized.includes('школ'))) {
      const quickAnswer = branchHit.address.includes('без адреса')
        ? `Да, у нас есть онлайн-обучение — занятия проходят дистанционно в удобное для вас время.`
        : `Да, у нас есть филиал: ${branchHit.title}. Адрес: ${branchHit.address}. Рядом с метро.`;
      const sources = [{ idx: 1, url: branchHit.url, title: branchHit.title, similarity: 1 }];
      return new Response(JSON.stringify({ answer: quickAnswer, sources, showContacts: false }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const priceTriggers = ['цена', 'стоим', 'сколько стоит', 'стоимость', 'прайс', 'оплата'];
    if (priceTriggers.some(p => normalized.includes(p))) {
      const quickAnswer = `Актуальные цены: групповые занятия от 800 руб/урок (8 занятий ~ 6400 руб), индивидуальные от 1200 руб/урок, онлайн — скидка 20%.`;
      const sources = [{ idx: 1, url: '/pricing', title: 'Цены на обучение', similarity: 1 }];
      return new Response(JSON.stringify({ answer: quickAnswer, sources, showContacts: false }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
    console.log('Performing vector search...');
    
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

    const siteName = "O'KEY ENGLISH";
    const instruction = `Ты — помощник школы английского языка ${siteName}. 

КРИТИЧЕСКИ ВАЖНО: Ты ОБЯЗАН отвечать конкретно на основе предоставленных источников. 

ЗАПРЕЩЕНО:
- Говорить "обратитесь к менеджеру" если информация есть в источниках
- Говорить "свяжитесь" если можешь ответить из источников  
- Перенаправлять к контактам при наличии информации

ОБЯЗАТЕЛЬНО:
- Отвечай прямо на вопрос из источников
- Используй конкретные факты: адреса, цены, программы
- В конце добавляй номера источников [1], [2]

ПРИМЕРЫ:
Вопрос: "Есть ли школа в Котельниках?"
Ответ: "Да, у нас есть филиал в Котельниках по адресу ул. Новая, 6, рядом с метро. [1]"

Вопрос: "Сколько стоит обучение?"  
Ответ: "Групповые занятия от 800 руб/урок, индивидуальные от 1200 руб/урок. [2]"`;

    const contextText = contexts
      ?.map((c: any, i: number) => `[${i + 1}] ${c.title}\n${c.content}\n`)
      .join("\n") || '';

    console.log('Context text length:', contextText.length);
    console.log('Number of contexts:', contexts?.length || 0);

    const hasContexts = !!(contexts && contexts.length > 0);

    const messages = [
      { role: "system", content: instruction },
      { 
        role: "user", 
        content: hasContexts 
          ? `ВОПРОС: ${question}\n\nИСТОЧНИКИ:\n${contextText}\n\nОТВЕЧАЙ КОНКРЕТНО ИЗ ИСТОЧНИКОВ! Укажи номера источников в конце.`
          : `ВОПРОС: ${question}\n\nИсточников нет. Скажи что нужно уточнить у менеджеров.`
      },
    ];

    // 3) Generate response using OpenAI
    console.log('OpenAI request:', {
      model: "gpt-5-mini-2025-08-07",
      hasContexts,
      contextLength: contextText.length,
      questionLength: question.length
    });
    const chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini-2025-08-07",
        messages,
        max_completion_tokens: 800,
      }),
    });

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
    const answer = chatJson.choices?.[0]?.message?.content || fallbackText;

    console.log('AI response:', answer);
    console.log('Response length:', answer.length);

    if (!chatJson.choices?.[0]?.message?.content) {
      console.warn('OpenAI returned empty content, falling back to contacts.');
    }
    
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
      showContacts: isUnknown || answer === fallbackText
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