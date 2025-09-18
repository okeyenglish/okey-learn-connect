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
    const instruction = `Ты — помощник сайта ${siteName}. Отвечай кратко и по делу, на русском.
Если вопрос не по теме школы и курсов — мягко верни пользователя к услугам школы.
Если источники есть — добавь релевантные ссылки на разделы сайта из списка источников. Если источников нет — отвечай без ссылок.`;

    const contextText = contexts
      ?.map((c: any, i: number) => `[#${i + 1}] ${c.title || ''} \nURL: ${c.url}\n${c.content.slice(0, 1200)}\n`)
      .join("\n\n") || '';

    const hasContexts = !!(contexts && contexts.length > 0);

    const messages = [
      { role: "system", content: instruction },
      { 
        role: "user", 
        content: `Вопрос: ${question}\n\nВот выдержки из сайта (источники):\n${contextText}\n\nСформируй ответ.${hasContexts ? " В конце укажи источники формата [1], [2]..." : " Источники не указывай."}` 
      },
    ];

    // 3) Generate response using OpenAI
    console.log('Generating response...');
    const chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-nano-2025-08-07",
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

    if (!chatJson.choices?.[0]?.message?.content) {
      console.warn('OpenAI returned empty content, falling back to contacts.');
    }
    
    // Check if the AI indicates it doesn't know the answer or we used fallback
    const unknownIndicators = [
      "не знаю", "не могу ответить", "не имею информации",
      "недостаточно информации", "обратитесь", "свяжитесь", "не удалось получить ответ"
    ];
    
    const isUnknown = unknownIndicators.some(indicator =>
      answer.toLowerCase().includes(indicator)
    );

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