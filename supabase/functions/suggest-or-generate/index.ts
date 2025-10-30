import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MASTER_SYSTEM = `Вы — продакт-дизайнер и генератор мини-приложений для изучения английского языка (EFL).

ВАШИ ЗАДАЧИ:
1. Анализировать запрос преподавателя
2. Если запрос недостаточно конкретен — запросить 2-3 уточнения
3. Если найдены похожие приложения — предложить их использовать
4. Если все понятно — подтвердить готовность к генерации

ФОРМАТЫ ОТВЕТА:

Для этапа ASK (нужны уточнения):
{
  "stage": "ask",
  "message": "Уточните детали для лучшего результата",
  "questions": [
    {"key": "level", "q": "Какой уровень?", "options": ["A1","A2","B1","B2","C1"]},
    {"key": "duration", "q": "Примерная длительность?", "options": ["5 минут","10 минут","15 минут"]},
    {"key": "features", "q": "Дополнительные функции?", "options": ["Таймер","Подсказки","Результаты"]}
  ]
}

Для этапа OFFER (найдены похожие):
{
  "stage": "offer",
  "message": "Нашлись готовые варианты, которые могут подойти",
  "suggestions": [...] // будет добавлено автоматически
}

Для этапа GENERATE (готово к генерации):
{
  "stage": "generate",
  "message": "Готов создать приложение",
  "prompt": {
    "title": "Название приложения",
    "type": "game",
    "brief": "Краткое описание задачи",
    "level": "A1",
    "duration": 10,
    "features": ["timer", "hints"]
  }
}

ВАЖНО: Отвечайте ТОЛЬКО валидным JSON, без дополнительного текста.`;

async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-large',
      input: text.slice(0, 8000)
    })
  });

  const data = await response.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { teacher_id, brief, answers } = await req.json();

    if (!teacher_id || !brief) {
      return new Response(
        JSON.stringify({ error: 'teacher_id and brief are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Search for similar apps using embeddings
    const embedding = await getEmbedding(brief);
    const { data: similarApps, error: similarError } = await supabase.rpc('similar_apps', {
      p_embedding: embedding,
      p_top: 6
    });

    if (similarError) {
      console.error('Similar apps search error:', similarError);
    }

    const suggestions = (similarApps || []).filter((s: any) => s.score >= 0.86);

    // 2. If found similar apps with high similarity, offer them
    if (suggestions.length > 0) {
      return new Response(
        JSON.stringify({
          stage: 'offer',
          message: 'Нашлись готовые варианты, которые могут подойти',
          suggestions
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Ask AI to analyze the brief
    const userMessage = answers 
      ? `Brief: ${brief}\nAnswers: ${JSON.stringify(answers)}`
      : `Brief: ${brief}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: MASTER_SYSTEM },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.2,
        max_tokens: 1000
      })
    });

    const aiData = await response.json();
    const content = aiData.choices[0].message?.content || '{}';

    let result;
    try {
      result = JSON.parse(content);
    } catch (e) {
      // If AI didn't return valid JSON, assume ready to generate
      result = {
        stage: 'generate',
        message: 'Готов создать приложение',
        prompt: { title: 'Generated App', type: 'game', brief }
      };
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in suggest-or-generate:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
