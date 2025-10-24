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

const SCHOOL_ARTICLE_PROMPT = `Ты - профессиональный контент-райтер для языковой школы "O'KEY ENGLISH".

**Задача:** Написать полноценную SEO-статью в HTML формате на основе брифа.

**Бриф:**
{{BRIEF}}

**Требования:**
1. Естественный, живой язык (не SEO-спам)
2. Полезная информация для читателя
3. Включить все ключевые слова органично
4. HTML разметка: <h2>, <h3>, <p>, <ul>, <ol>, <strong>, <em>
5. Добавить FAQ блок в конце (если есть в брифе)
6. CTA блок перед заключением
7. Внутренние ссылки на релевантные страницы школы
8. Длина текста: {{TARGET_WORD_COUNT}} слов ±200

**Структура HTML:**
<article>
  <section class="intro">...</section>
  <section class="main-content">
    <h2>...</h2>
    <p>...</p>
    ...
  </section>
  <section class="faq">
    <h2>Часто задаваемые вопросы</h2>
    <div class="faq-item">
      <h3>Вопрос?</h3>
      <p>Ответ</p>
    </div>
  </section>
  <section class="cta">
    <h2>{{CTA_TITLE}}</h2>
    <p>{{CTA_TEXT}}</p>
  </section>
</article>

Верни ТОЛЬКО HTML без обертки в \`\`\`.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ideaId, organizationId } = await req.json();
    console.log('[seo-generate-content] Starting for idea:', ideaId);

    if (!ideaId || !organizationId) {
      throw new Error('ideaId and organizationId are required');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Получаем идею с брифом
    const { data: idea, error: ideaError } = await supabase
      .from('content_ideas')
      .select('*')
      .eq('id', ideaId)
      .eq('organization_id', organizationId)
      .single();

    if (ideaError || !idea) {
      console.error('[seo-generate-content] Idea not found:', ideaError);
      throw new Error('Idea not found');
    }

    if (!idea.meta?.brief) {
      throw new Error('Brief not found for this idea. Create brief first.');
    }

    console.log('[seo-generate-content] Idea loaded:', idea.title);

    const brief = idea.meta.brief;

    // Формируем промпт
    const prompt = SCHOOL_ARTICLE_PROMPT
      .replace('{{BRIEF}}', JSON.stringify(brief, null, 2))
      .replace('{{TARGET_WORD_COUNT}}', (brief.target_word_count || 2000).toString())
      .replace('{{CTA_TITLE}}', brief.cta_block?.title || 'Запишитесь на пробный урок')
      .replace('{{CTA_TEXT}}', brief.cta_block?.text || 'Приходите познакомиться с O\'KEY ENGLISH');

    console.log('[seo-generate-content] Calling OpenAI...');

    // Вызываем OpenAI с более длинным контекстом
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Ты профессиональный контент-райтер для языковых школ. Пишешь естественно и убедительно.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[seo-generate-content] OpenAI error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let htmlContent = data.choices[0].message.content;

    console.log('[seo-generate-content] Content generated');

    // Очищаем HTML от markdown обертки если есть
    htmlContent = htmlContent.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();

    // Подсчитываем слова
    const wordCount = htmlContent.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).length;

    // Создаем документ контента
    const { data: contentDoc, error: docError } = await supabase
      .from('content_docs')
      .insert({
        organization_id: organizationId,
        idea_id: ideaId,
        html: htmlContent,
        word_count: wordCount,
        meta: {
          seo_title: brief.seo_title,
          meta_description: brief.meta_description,
          keywords: brief.keywords,
          generated_at: new Date().toISOString(),
        },
        version: 1,
      })
      .select()
      .single();

    if (docError) {
      console.error('[seo-generate-content] Error creating doc:', docError);
      throw docError;
    }

    // Обновляем идею
    await supabase
      .from('content_ideas')
      .update({
        status: 'content_ready',
      })
      .eq('id', ideaId);

    console.log('[seo-generate-content] Content created successfully, words:', wordCount);

    // Логируем задачу
    await supabase.from('seo_job_logs').insert({
      organization_id: organizationId,
      job_type: 'generate_content',
      status: 'success',
      input_data: { ideaId },
      output_data: { word_count: wordCount, doc_id: contentDoc.id },
    });

    return new Response(JSON.stringify({
      success: true,
      content: contentDoc,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[seo-generate-content] Error:', error);

    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
