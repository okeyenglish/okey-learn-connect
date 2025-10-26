import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Промпт для генерации идей
const SCHOOL_IDEAS_PROMPT = `Ты - эксперт по SEO-контенту для языковой школы "O'KEY ENGLISH" (Московская область).

Бренд: O'KEY ENGLISH – сеть современных языковых школ с 3+ филиалами. 
Миссия: Качественное обучение английскому для детей и взрослых, дружная атмосфера, гибкие форматы (группы, индивидуальные, онлайн).

Филиалы:
- Одинцово (Москва), ул. Молодёжная д.46
- Звенигород, мкр. Южный д.7 ТРЦ Звенигород Молл
- Наро-Фоминск, ул. Маршала Жукова д. 16, ТЦ «Гулливер»

ЦА: Родители детей 4-17 лет, взрослые 18+, которые хотят учить английский в формате «с нуля до свободного».

Твоя задача – на основе **кластера запросов** предложить 5-7 четких, SEO-ориентированных статей, которые:
1. Попадают в намерение поиска.
2. Демонстрируют экспертность школы (О'КЕЙ).
3. Решают боль/вопрос пользователя.
4. Подводят к действию: Запись на пробный урок / консультацию.

Каждую идею верни в JSON-формате:
{
  "title": "...",
  "search_intent": "informational | commercial | navigational",
  "priority": "high | medium | low",
  "target_audience": "Краткое описание ЦА",
  "pain_point": "Какую боль решает",
  "cta": "Какой призыв к действию",
  "internal_links_suggestions": ["..."]
}

**Кластер запросов:**
{{CLUSTER_QUERIES}}

**Общие метрики кластера:**
- Средняя частотность: {{AVG_FREQ}}
- Уровень конкуренции: {{COMPETITION}}

Верни массив из 5-7 идей в формате JSON array.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { kwClusterId, organizationId } = await req.json();
    console.log('[seo-suggest-ideas] Starting for cluster:', kwClusterId);

    if (!kwClusterId || !organizationId) {
      throw new Error('kwClusterId and organizationId are required');
    }

    // Создаем Supabase клиент с service role для доступа к данным
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Получаем данные кластера
    const { data: cluster, error: clusterError } = await supabase
      .from('kw_clusters')
      .select('*, kw_norm(*)')
      .eq('id', kwClusterId)
      .eq('organization_id', organizationId)
      .single();

    if (clusterError || !cluster) {
      console.error('[seo-suggest-ideas] Cluster not found:', clusterError);
      throw new Error('Cluster not found');
    }

    console.log('[seo-suggest-ideas] Cluster loaded:', cluster.name);

    // Формируем список запросов из кластера
    const queries = cluster.kw_norm
      .map((kw: any) => `- ${kw.query_norm} (частотность: ${kw.wordstat_freq || 0})`)
      .join('\n');

    const avgFreq = cluster.kw_norm.reduce((sum: number, kw: any) => sum + (kw.wordstat_freq || 0), 0) / cluster.kw_norm.length;
    
    // Формируем промпт
    const prompt = SCHOOL_IDEAS_PROMPT
      .replace('{{CLUSTER_QUERIES}}', queries)
      .replace('{{AVG_FREQ}}', Math.round(avgFreq).toString())
      .replace('{{COMPETITION}}', cluster.competition_level || 'unknown');

    console.log('[seo-suggest-ideas] Calling Lovable AI...');

    // Вызываем Lovable AI Gateway (openai/gpt-5-nano - самая дешевая модель)
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-nano',
        messages: [
          { role: 'system', content: 'Ты эксперт по SEO-контенту для языковых школ.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[seo-suggest-ideas] Lovable AI error:', errorText);
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content;
    
    console.log('[seo-suggest-ideas] Lovable AI response received');

    // Парсим JSON из ответа
    let ideas;
    try {
      // Пытаемся найти JSON массив в тексте
      const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        ideas = JSON.parse(jsonMatch[0]);
      } else {
        ideas = JSON.parse(generatedText);
      }
    } catch (parseError) {
      console.error('[seo-suggest-ideas] Failed to parse JSON:', parseError);
      console.error('[seo-suggest-ideas] Raw response:', generatedText);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Сохраняем идеи в БД
    const savedIdeas = [];
    for (const idea of ideas) {
      const { data: savedIdea, error: saveError } = await supabase
        .from('content_ideas')
        .insert({
          organization_id: organizationId,
          kw_cluster_id: kwClusterId,
          title: idea.title,
          search_intent: idea.search_intent,
          priority: idea.priority,
          target_audience: idea.target_audience,
          pain_point: idea.pain_point,
          cta: idea.cta,
          internal_links_suggestions: idea.internal_links_suggestions || [],
          status: 'pending',
        })
        .select()
        .single();

      if (saveError) {
        console.error('[seo-suggest-ideas] Error saving idea:', saveError);
      } else {
        savedIdeas.push(savedIdea);
      }
    }

    console.log('[seo-suggest-ideas] Saved', savedIdeas.length, 'ideas');

    // Логируем задачу
    await supabase.from('seo_job_logs').insert({
      organization_id: organizationId,
      job_type: 'suggest_ideas',
      status: 'success',
      input_data: { kwClusterId },
      output_data: { ideas_count: savedIdeas.length },
    });

    return new Response(JSON.stringify({ 
      success: true, 
      ideas: savedIdeas 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[seo-suggest-ideas] Error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
