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

const ANALYSIS_PROMPT = `Ты - SEO эксперт для языковой школы "O'KEY ENGLISH".

**Данные страницы:**
URL: {{URL}}
Текущий контент:
{{CONTENT}}

**Релевантные запросы из базы:**
{{KEYWORDS}}

**Задача:**
Проанализируй страницу и создай план оптимизации для продвижения по этим запросам.

**Верни JSON:**
{
  "target_keywords": ["главный запрос 1", "главный запрос 2", ...],
  "current_issues": ["проблема 1", "проблема 2", ...],
  "recommendations": {
    "title": "Оптимизированный title (до 60 символов)",
    "meta_description": "Оптимизированное description (до 160 символов)",
    "h1": "Оптимизированный H1",
    "content_structure": ["раздел 1", "раздел 2", ...],
    "internal_links": ["рекомендуемая ссылка 1", "рекомендуемая ссылка 2", ...],
    "additional_sections": ["FAQ про {{запрос}}", "Преимущества для {{локация}}", ...]
  },
  "priority": "high|medium|low"
}

Учитывай:
- Естественность текста (не SEO-спам)
- Локальную специфику для филиалов
- Коммерческий intent для страниц услуг
- Информационный intent для статей`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, organizationId } = await req.json();
    console.log('[seo-analyze-page] Analyzing:', url);

    if (!url || !organizationId) {
      throw new Error('url and organizationId are required');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Получаем контент страницы (симуляция - в реальности нужен парсер)
    const pageContent = `Placeholder content for ${url}`;

    // Получаем релевантные ключевые слова из базы
    const { data: keywords } = await supabase
      .from('kw_norm')
      .select('query, freq')
      .order('freq', { ascending: false })
      .limit(50);

    const keywordsList = keywords?.map(k => `${k.query} (${k.freq} показов)`).join('\n') || '';

    const prompt = ANALYSIS_PROMPT
      .replace('{{URL}}', url)
      .replace('{{CONTENT}}', pageContent)
      .replace('{{KEYWORDS}}', keywordsList);

    console.log('[seo-analyze-page] Calling OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Ты SEO эксперт. Отвечай строго в формате JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[seo-analyze-page] OpenAI error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let analysisText = data.choices[0].message.content;

    // Очищаем JSON от markdown обертки
    analysisText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysis = JSON.parse(analysisText);

    console.log('[seo-analyze-page] Analysis complete');

    // Сохраняем или обновляем запись о странице
    const { data: existingPage } = await supabase
      .from('seo_pages')
      .select('id')
      .eq('url', url)
      .eq('organization_id', organizationId)
      .single();

    if (existingPage) {
      await supabase
        .from('seo_pages')
        .update({
          analysis,
          last_analyzed_at: new Date().toISOString(),
        })
        .eq('id', existingPage.id);
    } else {
      await supabase
        .from('seo_pages')
        .insert({
          organization_id: organizationId,
          url,
          analysis,
          last_analyzed_at: new Date().toISOString(),
        });
    }

    // Логируем
    await supabase.from('seo_job_logs').insert({
      organization_id: organizationId,
      job_type: 'analyze_page',
      status: 'success',
      input_data: { url },
      output_data: { priority: analysis.priority },
    });

    return new Response(JSON.stringify({
      success: true,
      analysis,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[seo-analyze-page] Error:', error);

    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
