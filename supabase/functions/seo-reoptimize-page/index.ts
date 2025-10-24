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

const REOPTIMIZE_PROMPT = `Ты - SEO-эксперт языковой школы "O'KEY ENGLISH".

**Задача:** Улучшить существующую страницу для повышения позиций в поиске.

**Текущая страница:**
URL: {{URL}}
HTML: {{CURRENT_HTML}}

**Проблемы:**
{{ISSUES}}

**Метрики:**
- Средняя позиция: {{AVG_POSITION}}
- CTR: {{CTR}}%
- Показы: {{IMPRESSIONS}}
- Клики: {{CLICKS}}

**Что нужно исправить:**
1. Улучшить SEO-теги (title, description, H1)
2. Добавить недостающие элементы (FAQ, внутренние ссылки)
3. Улучшить структуру контента
4. Добавить релевантные ключевые слова

Верни JSON с улучшениями:
{
  "new_seo_title": "...",
  "new_meta_description": "...",
  "new_h1": "...",
  "improvements": [
    {
      "type": "add_section | modify_section | add_faq | add_links",
      "html": "HTML код улучшения"
    }
  ],
  "added_keywords": ["ключ 1", "ключ 2"],
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

    // Получаем последние метрики
    const { data: metrics } = await supabase
      .from('content_metrics')
      .select('*')
      .eq('content_id', contentId)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    // Проверяем качество текущего контента
    const qualityIssues = content.quality?.issues || [];
    const issuesText = qualityIssues.map((i: any) => `- ${i.type}: ${i.message}`).join('\n');

    console.log('[seo-reoptimize-page] Quality issues:', qualityIssues.length);

    // Формируем промпт
    const prompt = REOPTIMIZE_PROMPT
      .replace('{{URL}}', content.content_ideas?.route || 'unknown')
      .replace('{{CURRENT_HTML}}', content.html.substring(0, 3000)) // Первые 3000 символов
      .replace('{{ISSUES}}', issuesText || 'Нет явных проблем')
      .replace('{{AVG_POSITION}}', metrics?.avg_position?.toString() || 'н/д')
      .replace('{{CTR}}', metrics?.ctr?.toString() || 'н/д')
      .replace('{{IMPRESSIONS}}', metrics?.impressions?.toString() || 'н/д')
      .replace('{{CLICKS}}', metrics?.clicks?.toString() || 'н/д');

    console.log('[seo-reoptimize-page] Calling OpenAI...');

    // Вызываем OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Ты SEO-эксперт. Улучшаешь существующие страницы для лучших позиций.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[seo-reoptimize-page] OpenAI error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content;

    console.log('[seo-reoptimize-page] Improvements received');

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
        improvements_count: improvements.improvements?.length || 0
      },
    });

    return new Response(JSON.stringify({
      success: true,
      improvements,
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
