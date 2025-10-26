import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const KEYWORD_SELECTION_PROMPT = `Ты - SEO-эксперт языковой школы "O'KEY ENGLISH".

**Задача:** Выбрать ключевые слова для оптимизации страницы.

**Страница:**
URL: {{URL}}
Контент: {{CURRENT_HTML}}

**Текущие метрики (по каким запросам УЖЕ есть показы):**
{{CURRENT_QUERIES}}

**Доступные запросы из Wordstat:**
{{AVAILABLE_KEYWORDS}}

**Что нужно сделать:**
1. Из ТЕКУЩИХ запросов выбери ТОП-5, которые нужно УСИЛИТЬ (у них уже есть показы)
2. Из Wordstat выбери ТОП-5 НОВЫХ запросов, по которым страница НЕ выдается, но ДОЛЖНА (например, "Английский язык в Кузьминках")

Верни JSON:
{
  "strengthen_keywords": [
    {
      "phrase": "...",
      "reason": "уже {{impressions}} показов, позиция {{position}}, нужно усилить",
      "monthly_searches": 1200
    }
  ],
  "new_keywords": [
    {
      "phrase": "...",
      "reason": "высокий потенциал ({{monthly_searches}} запросов/мес), релевантно теме страницы",
      "monthly_searches": 800
    }
  ]
}`;

const REOPTIMIZE_PROMPT = `Ты - SEO-эксперт языковой школы "O'KEY ENGLISH".

**Задача:** Оптимизировать страницу под выбранные ключевые слова.

**Текущая страница:**
URL: {{URL}}
HTML: {{CURRENT_HTML}}

**Ключевые слова для УСИЛЕНИЯ (уже есть показы):**
{{STRENGTHEN_KEYWORDS}}

**НОВЫЕ ключевые слова (добавить на страницу):**
{{NEW_KEYWORDS}}

**Текущие проблемы:**
{{ISSUES}}

**Что нужно сделать:**
1. УСИЛИТЬ существующие запросы (добавить в H1, H2, мета-теги, контент)
2. ДОБАВИТЬ новые запросы естественным образом в контент
3. Улучшить SEO-теги (title, description, H1)
4. Улучшить структуру контента

Верни JSON с улучшениями:
{
  "new_seo_title": "...",
  "new_meta_description": "...",
  "new_h1": "...",
  "improvements": [
    {
      "type": "add_section | modify_section | add_faq | add_links",
      "html": "HTML код улучшения",
      "target_keywords": ["ключ 1", "ключ 2"]
    }
  ],
  "quality_score_improvement": 15
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contentId, organizationId } = await req.json();
    console.log('[seo-reoptimize-page] Starting for content:', contentId);

    if (!contentId || !organizationId) {
      throw new Error('contentId and organizationId are required');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Получаем контент и его метрики
    const { data: content, error: contentError } = await supabase
      .from('content_docs')
      .select('*, content_ideas!content_docs_idea_id_fkey(*)')
      .eq('id', contentId)
      .eq('organization_id', organizationId)
      .single();

    if (contentError || !content) {
      console.error('[seo-reoptimize-page] Content not found:', contentError);
      throw new Error('Content not found');
    }

    // Получаем последние метрики (по каким запросам уже есть показы)
    // ПРИМЕЧАНИЕ: Для полной работы нужно импортировать данные из Google Search Console
    const { data: metrics } = await supabase
      .from('content_metrics')
      .select('*')
      .eq('content_id', contentId)
      .order('date', { ascending: false })
      .limit(30); // Последние 30 дней для анализа запросов

    // Формируем текущие запросы с показами
    // TODO: Добавить таблицу search_queries для хранения данных GSC по запросам
    const currentQueries: any[] = [];
    const hasQueryData = false; // Пока нет данных по запросам

    console.log('[seo-reoptimize-page] Current queries with impressions:', currentQueries.length);

    // Получаем все доступные ключевые слова из Wordstat
    const { data: keywords } = await supabase
      .from('kw_norm')
      .select('phrase, monthly_searches, difficulty, intent')
      .eq('organization_id', organizationId)
      .order('monthly_searches', { ascending: false })
      .limit(100);

    console.log('[seo-reoptimize-page] Available Wordstat keywords:', keywords?.length || 0);

    // Проверяем качество текущего контента
    const qualityIssues = content.quality?.issues || [];
    const issuesText = qualityIssues.map((i: any) => `- ${i.type}: ${i.message}`).join('\n');

    // Шаг 1: GPT выбирает ключевые слова
    console.log('[seo-reoptimize-page] Step 1: Selecting keywords...');
    
    const keywordSelectionPrompt = KEYWORD_SELECTION_PROMPT
      .replace('{{URL}}', content.content_ideas?.route || 'unknown')
      .replace('{{CURRENT_HTML}}', content.html.substring(0, 2000))
      .replace('{{CURRENT_QUERIES}}', hasQueryData && currentQueries.length > 0
        ? currentQueries.map(q => `- "${q.query}": ${q.impressions} показов, позиция ${q.position.toFixed(1)}`).join('\n')
        : 'НЕТ ДАННЫХ из Google Search Console. Выбери запросы для усиления из Wordstat на основе темы страницы.')
      .replace('{{AVAILABLE_KEYWORDS}}', keywords?.length 
        ? keywords.map(k => `- "${k.phrase}": ${k.monthly_searches} запросов/мес (сложность: ${k.difficulty || 'н/д'})`).join('\n')
        : 'Нет данных из Wordstat');

    const keywordResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Ты SEO-эксперт. Выбираешь ключевые слова для оптимизации страниц.' },
          { role: 'user', content: keywordSelectionPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!keywordResponse.ok) {
      const errorText = await keywordResponse.text();
      console.error('[seo-reoptimize-page] OpenAI keyword selection error:', errorText);
      throw new Error(`OpenAI API error: ${keywordResponse.status}`);
    }

    const keywordData = await keywordResponse.json();
    const keywordText = keywordData.choices[0].message.content;

    let selectedKeywords;
    try {
      const jsonMatch = keywordText.match(/\{[\s\S]*\}/);
      selectedKeywords = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(keywordText);
    } catch (parseError) {
      console.error('[seo-reoptimize-page] Failed to parse keywords JSON:', parseError);
      throw new Error('Failed to parse keyword selection');
    }

    console.log('[seo-reoptimize-page] Selected keywords:', {
      strengthen: selectedKeywords.strengthen_keywords?.length || 0,
      new: selectedKeywords.new_keywords?.length || 0,
    });

    // Шаг 2: GPT оптимизирует контент под выбранные ключевые слова
    console.log('[seo-reoptimize-page] Step 2: Optimizing content...');

    const optimizationPrompt = REOPTIMIZE_PROMPT
      .replace('{{URL}}', content.content_ideas?.route || 'unknown')
      .replace('{{CURRENT_HTML}}', content.html.substring(0, 3000))
      .replace('{{STRENGTHEN_KEYWORDS}}', selectedKeywords.strengthen_keywords?.length
        ? selectedKeywords.strengthen_keywords.map((k: any) => `- "${k.phrase}": ${k.reason}`).join('\n')
        : 'Нет ключевых слов для усиления')
      .replace('{{NEW_KEYWORDS}}', selectedKeywords.new_keywords?.length
        ? selectedKeywords.new_keywords.map((k: any) => `- "${k.phrase}": ${k.reason}`).join('\n')
        : 'Нет новых ключевых слов')
      .replace('{{ISSUES}}', issuesText || 'Нет явных проблем');

    const optimizationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Ты SEO-эксперт. Оптимизируешь контент под ключевые слова.' },
          { role: 'user', content: optimizationPrompt }
        ],
        temperature: 0.4,
        max_tokens: 3000,
      }),
    });

    if (!optimizationResponse.ok) {
      const errorText = await optimizationResponse.text();
      console.error('[seo-reoptimize-page] OpenAI optimization error:', errorText);
      throw new Error(`OpenAI API error: ${optimizationResponse.status}`);
    }

    const optimizationData = await optimizationResponse.json();
    const generatedText = optimizationData.choices[0].message.content;

    console.log('[seo-reoptimize-page] Optimization received');

    // Парсим JSON
    let improvements;
    try {
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        improvements = JSON.parse(jsonMatch[0]);
      } else {
        improvements = JSON.parse(generatedText);
      }
    } catch (parseError) {
      console.error('[seo-reoptimize-page] Failed to parse JSON:', parseError);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Создаем новую версию документа
    const { data: newVersion, error: versionError } = await supabase
      .from('content_docs')
      .insert({
        organization_id: organizationId,
        idea_id: content.idea_id,
        html: content.html, // Пока оставляем старый HTML
        word_count: content.word_count,
        meta: {
          ...content.meta,
          improvements,
          selected_keywords: selectedKeywords,
          reoptimized_at: new Date().toISOString(),
          previous_version: content.id,
        },
        version: (content.version || 1) + 1,
      })
      .select()
      .single();

    if (versionError) {
      console.error('[seo-reoptimize-page] Error creating new version:', versionError);
      throw versionError;
    }

    console.log('[seo-reoptimize-page] New version created:', newVersion.id);

    // Логируем задачу
    await supabase.from('seo_job_logs').insert({
      organization_id: organizationId,
      job_type: 'reoptimize',
      status: 'success',
      input_data: { contentId },
      output_data: { 
        new_version_id: newVersion.id,
        improvements_count: improvements.improvements?.length || 0,
        strengthen_keywords: selectedKeywords.strengthen_keywords?.length || 0,
        new_keywords: selectedKeywords.new_keywords?.length || 0,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      improvements,
      selected_keywords: selectedKeywords,
      new_version: newVersion,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[seo-reoptimize-page] Error:', error);

    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
