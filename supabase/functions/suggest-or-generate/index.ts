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
2. МАКСИМУМ ОДИН РАЗ задать 1-2 самых важных уточняющих вопроса (только если критически необходимо)
3. В остальных случаях — сразу готовить к генерации с разумными дефолтами

ПРАВИЛА:
- НЕ задавайте вопросы про уровень, длительность, функции если можно вывести из контекста
- Если уже были ответы на вопросы — БОЛЬШЕ НЕ ЗАДАВАЙТЕ вопросы, сразу переходите к GENERATE
- Используйте дефолты: level="A2", duration=10, features=["timer","results"]
- Вопросы задавайте ТОЛЬКО если запрос совсем неясен (например "сделай что-нибудь")

ФОРМАТЫ ОТВЕТА:

Для этапа ASK (нужно критическое уточнение - используйте РЕДКО):
{
  "stage": "ask",
  "message": "Что именно вы хотите создать?",
  "questions": [
    {"key": "details", "q": "Опишите подробнее", "options": ["Игра-викторина","Карточки для запоминания","Упражнение на грамматику","Интерактивная история"]}
  ]
}

Для этапа GENERATE (используйте В БОЛЬШИНСТВЕ случаев):
{
  "stage": "generate",
  "message": "Создам игру на основе вашего описания",
  "prompt": {
    "title": "Конкретное название (например: 'Do vs Does Quiz' или 'Daily Routine Match')",
    "description": "Описание для преподавателя: что делает приложение, какие навыки развивает, как использовать (2-3 предложения)",
    "type": "game",
    "brief": "Детальное техническое задание: механика, интерфейс, данные, количество вопросов/карточек",
    "level": "A2",
    "duration": 10,
    "features": ["timer", "results"]
  }
}

КРИТИЧЕСКИ ВАЖНО:
- Если пользователь уже дал ответы (answers) — ВСЕГДА возвращайте stage: "generate"
- Задавайте вопросы только если запрос пустой или совсем непонятный
- "title" — конкретное и запоминающееся название
- "description" — методические рекомендации для преподавателя
- "brief" — техническое задание с деталями

Пример:
Запрос: "Игра на do/does"
Ответ:
{
  "stage": "generate",
  "message": "Создам игру для отработки do/does",
  "prompt": {
    "title": "Do vs Does Practice Game",
    "description": "Интерактивная викторина для отработки правильного выбора do/does в вопросах Present Simple. 15 вопросов с визуальными подсказками. Для уровня A1-A2, работа индивидуально или в парах.",
    "type": "game",
    "brief": "Создать викторину с 15 вопросами на выбор правильной формы do/does. Примеры: '__ you like pizza?', '__ she speak English?'. Таймер 8 минут, счетчик правильных ответов, финальный экран с результатами и кнопкой 'Попробовать снова'.",
    "level": "A2",
    "duration": 10,
    "features": ["timer", "results"]
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
      model: 'text-embedding-3-small',
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
    let similarApps: any[] = [];
    try {
      const embedding = await getEmbedding(brief);
      const { data, error: similarError } = await supabase.rpc('similar_apps', {
        p_embedding: embedding,
        p_top: 6
      });

      if (similarError) {
        console.error('Similar apps search error:', similarError);
      } else {
        similarApps = (data || []).filter((s: any) => s.score >= 0.82);
      }
    } catch (e) {
      console.error('Embedding/search failed:', e);
    }

    // 2. Ask AI to analyze the brief
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

    // 3. Add similar apps to the result if found
    if (similarApps.length > 0) {
      result.suggestions = similarApps;
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
