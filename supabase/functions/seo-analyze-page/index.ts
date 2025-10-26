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

**КРИТИЧЕСКИ ВАЖНО:**
- Анализируй ТОЛЬКО то, что реально есть на странице
- НЕ выдумывай проблемы, если их нет
- Если структура хорошая, так и скажи
- Если title/description/H1 хорошие, не меняй их кардинально

**Фактические данные страницы:**
URL: {{URL}}

Title: {{TITLE}}
Meta Description: {{META_DESC}}
H1: {{H1}}
H2 теги: {{H2_TAGS}}

Основной контент (первые 1000 символов):
{{CONTENT}}

**Релевантные запросы из базы:**
{{KEYWORDS}}

**Задача:**
1. Проверь, есть ли РЕАЛЬНЫЕ проблемы с SEO (пустой title, отсутствие H1, дублирование)
2. Оцени, насколько текущий контент соответствует целевым запросам
3. Дай конкретные рекомендации ТОЛЬКО если есть что улучшить

**Верни JSON:**
{
  "target_keywords": ["2-3 главных запроса из базы, релевантных странице"],
  "current_issues": ["ТОЛЬКО реальные проблемы, если есть. Например: 'Title дублирует H1', 'Нет meta description', 'H1 отсутствует'"],
  "recommendations": {
    "title": "Улучшенный title (только если текущий плохой)",
    "meta_description": "Улучшенное description (только если текущее плохое)",
    "h1": "Улучшенный H1 (только если текущий плохой)",
    "content_structure": ["Конкретные разделы, которых не хватает"],
    "internal_links": ["Ссылки на другие страницы сайта, которые стоит добавить"],
    "additional_sections": ["Конкретные блоки контента, которые улучшат страницу"]
  },
  "priority": "high - если много критичных проблем | medium - если есть что улучшить | low - если все хорошо"
}`;

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

    // Получаем РЕАЛЬНЫЙ HTML страницы
    const baseUrl = 'https://okeyenglish.ru';
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    
    console.log('[seo-analyze-page] Fetching page:', fullUrl);
    let pageHtml = '';
    let title = '';
    let metaDesc = '';
    let h1 = '';
    let h2Tags: string[] = [];
    let mainContent = '';

    try {
      const pageResponse = await fetch(fullUrl);
      if (pageResponse.ok) {
        pageHtml = await pageResponse.text();
        
        // Извлекаем title
        const titleMatch = pageHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
        title = titleMatch ? titleMatch[1].trim() : 'Не найден';
        
        // Извлекаем meta description
        const metaMatch = pageHtml.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
        metaDesc = metaMatch ? metaMatch[1].trim() : 'Не найдена';
        
        // Извлекаем H1
        const h1Match = pageHtml.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        h1 = h1Match ? h1Match[1].trim().replace(/<[^>]*>/g, '') : 'Не найден';
        
        // Извлекаем H2
        const h2Matches = pageHtml.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi);
        h2Tags = Array.from(h2Matches).map(m => m[1].trim().replace(/<[^>]*>/g, ''));
        
        // Извлекаем текст из body (упрощенно, убираем скрипты и стили)
        const bodyMatch = pageHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        if (bodyMatch) {
          mainContent = bodyMatch[1]
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 1000);
        }
      } else {
        console.warn('[seo-analyze-page] Failed to fetch page:', pageResponse.status);
        mainContent = `Не удалось загрузить страницу (статус ${pageResponse.status})`;
      }
    } catch (fetchError) {
      console.error('[seo-analyze-page] Fetch error:', fetchError);
      mainContent = 'Ошибка при загрузке страницы';
    }

    // Получаем релевантные ключевые слова из базы
    const { data: keywords } = await supabase
      .from('kw_norm')
      .select('query, freq')
      .eq('organization_id', organizationId)
      .order('freq', { ascending: false })
      .limit(30);

    const keywordsList = keywords?.map(k => `${k.query} (${k.freq} показов/мес)`).join('\n') || 'Нет данных';

    const prompt = ANALYSIS_PROMPT
      .replace('{{URL}}', url)
      .replace('{{TITLE}}', title)
      .replace('{{META_DESC}}', metaDesc)
      .replace('{{H1}}', h1)
      .replace('{{H2_TAGS}}', h2Tags.length > 0 ? h2Tags.join(', ') : 'Нет H2')
      .replace('{{CONTENT}}', mainContent)
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
