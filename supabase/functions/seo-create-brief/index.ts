import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SCHOOL_BRIEF_PROMPT = `Ты - SEO-редактор языковой школы "O'KEY ENGLISH".

Задача: создать подробный контент-бриф для статьи.

**Входные данные:**
- Заголовок: {{TITLE}}
- H1: {{H1}}
- Целевая аудитория: {{TARGET_AUDIENCE}}
- Боль/проблема: {{PAIN_POINT}}
- CTA: {{CTA}}
- Связанные запросы: {{KEYWORDS}}

**Структура брифа (JSON):**
{
  "seo_title": "SEO-заголовок (до 60 символов)",
  "meta_description": "Мета-описание (до 160 символов)",
  "h1": "Основной заголовок H1",
  "intro": "Вводный абзац (2-3 предложения)",
  "outline": [
    {
      "h2": "Заголовок раздела",
      "points": ["пункт 1", "пункт 2"],
      "internal_links": ["страница 1", "страница 2"]
    }
  ],
  "faq": [
    {"question": "...", "answer": "..."}
  ],
  "cta_block": {
    "title": "Призыв к действию",
    "text": "Текст CTA"
  },
  "keywords": ["ключ 1", "ключ 2"],
  "target_word_count": 2000
}

Верни ТОЛЬКО валидный JSON без дополнительного текста.`;

async function getOpenAIKey(supabase: any, organizationId: string): Promise<string> {
  const { data: aiSettings } = await supabase
    .from('messenger_settings')
    .select('settings')
    .eq('organization_id', organizationId)
    .eq('messenger_type', 'openai')
    .maybeSingle();

  const apiKey = aiSettings?.settings?.openaiApiKey || Deno.env.get('OPENAI_API_KEY');
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured for this organization');
  }
  
  return apiKey;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ideaId, organizationId } = await req.json();
    console.log('[seo-create-brief] Starting for idea:', ideaId);

    if (!ideaId || !organizationId) {
      throw new Error('ideaId and organizationId are required');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Получаем OpenAI API Key из настроек организации
    const openaiApiKey = await getOpenAIKey(supabase, organizationId);

    // Получаем идею и кластер
    const { data: idea, error: ideaError } = await supabase
      .from('content_ideas')
      .select('*, kw_clusters!content_ideas_cluster_id_fkey(*, kw_norm(*))')
      .eq('id', ideaId)
      .eq('organization_id', organizationId)
      .single();

    if (ideaError || !idea) {
      console.error('[seo-create-brief] Idea not found:', ideaError);
      throw new Error('Idea not found');
    }

    console.log('[seo-create-brief] Idea loaded:', idea.title);

    // Формируем список ключевых слов
    const keywords = idea.kw_clusters?.kw_norm
      ?.map((kw: any) => kw.query_norm)
      .join(', ') || '';

    // Формируем промпт
    const prompt = SCHOOL_BRIEF_PROMPT
      .replace('{{TITLE}}', idea.title)
      .replace('{{H1}}', idea.h1 || idea.title)
      .replace('{{TARGET_AUDIENCE}}', idea.target_audience || 'Родители и взрослые студенты')
      .replace('{{PAIN_POINT}}', idea.pain_point || 'Выбор языковой школы')
      .replace('{{CTA}}', idea.cta || 'Записаться на пробный урок')
      .replace('{{KEYWORDS}}', keywords);

    console.log('[seo-create-brief] Calling OpenAI...');

    // Вызываем OpenAI API (gpt-4o-mini - недорогая модель)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Ты SEO-редактор. Создаешь брифы для контент-райтеров.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[seo-create-brief] OpenAI error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content;

    console.log('[seo-create-brief] OpenAI response received');

    // Парсим JSON
    let brief;
    try {
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        brief = JSON.parse(jsonMatch[0]);
      } else {
        brief = JSON.parse(generatedText);
      }
    } catch (parseError) {
      console.error('[seo-create-brief] Failed to parse JSON:', parseError);
      console.error('[seo-create-brief] Raw response:', generatedText);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Обновляем идею с брифом
    const { data: updatedIdea, error: updateError } = await supabase
      .from('content_ideas')
      .update({
        meta: {
          ...idea.meta,
          brief,
          brief_created_at: new Date().toISOString(),
        },
        status: 'brief_ready',
      })
      .eq('id', ideaId)
      .select()
      .single();

    if (updateError) {
      console.error('[seo-create-brief] Error updating idea:', updateError);
      throw updateError;
    }

    console.log('[seo-create-brief] Brief created successfully');

    // Логируем задачу
    await supabase.from('seo_job_logs').insert({
      organization_id: organizationId,
      job_type: 'create_brief',
      status: 'success',
      input_data: { ideaId },
      output_data: { brief },
    });

    return new Response(JSON.stringify({
      success: true,
      idea: updatedIdea,
      brief,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[seo-create-brief] Error:', error);

    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
