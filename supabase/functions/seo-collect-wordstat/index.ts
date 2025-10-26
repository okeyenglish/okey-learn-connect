import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const YANDEX_WORDSTAT_TOKEN = Deno.env.get('YANDEX_WORDSTAT_TOKEN');
const YANDEX_OAUTH_TOKEN = Deno.env.get('YANDEX_OAUTH_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Локации школ O'KEY ENGLISH
const SCHOOL_LOCATIONS = [
  { name: 'Одинцово', region_id: 213 }, // Москва
  { name: 'Звенигород', region_id: 20729 },
  { name: 'Наро-Фоминск', region_id: 20730 },
  { name: 'Кузьминки', region_id: 213 },
  { name: 'Московская область', region_id: 1 },
];

// Базовые запросы для школы
const BASE_QUERIES = [
  'английский для детей',
  'английский для взрослых',
  'курсы английского языка',
  'школа английского',
  'обучение английскому',
  'английский онлайн',
  'разговорный английский',
  'английский с нуля',
  'подготовка к ЕГЭ английский',
  'английский для школьников',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organizationId } = await req.json();
    console.log('[seo-collect-wordstat] Starting collection for org:', organizationId);

    if (!organizationId) {
      throw new Error('organizationId is required');
    }

    if (!YANDEX_WORDSTAT_TOKEN && !YANDEX_OAUTH_TOKEN) {
      throw new Error('YANDEX_WORDSTAT_TOKEN or YANDEX_OAUTH_TOKEN not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const collectedKeywords: any[] = [];

    // Собираем данные по каждой локации и базовому запросу
    for (const location of SCHOOL_LOCATIONS) {
      for (const baseQuery of BASE_QUERIES) {
        try {
          console.log(`[seo-collect-wordstat] Collecting: ${baseQuery} in ${location.name}`);

          // Формируем полный запрос с локацией
          const fullQuery = `${baseQuery} ${location.name}`;

          // Вызываем Yandex.Wordstat API v5
          const wordstatResponse = await fetch('https://api-sandbox.direct.yandex.ru/v5/wordstat', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${YANDEX_OAUTH_TOKEN || YANDEX_WORDSTAT_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              method: 'get',
              params: {
                Phrases: [fullQuery],
                GeoID: [location.region_id],
                IncludeLemmas: true,
              }
            }),
          });

          if (!wordstatResponse.ok) {
            const errorText = await wordstatResponse.text();
            console.error('[seo-collect-wordstat] Wordstat API error:', errorText);
            continue; // Пропускаем эту локацию и переходим к следующей
          }

          const wordstatData = await wordstatResponse.json();
          
          // Парсим результаты
          if (wordstatData.result?.data) {
            for (const item of wordstatData.result.data) {
              const phrase = item.Phrase;
              const shows = item.Shows || 0;

              if (shows > 10) { // Собираем только запросы с частотой > 10
                collectedKeywords.push({
                  phrase: phrase,
                  region: location.name,
                  monthly_searches: shows,
                  difficulty: 50,
                  intent: 'informational',
                  organization_id: organizationId,
                });
              }
            }
          }

          // Задержка между запросами (500мс)
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`[seo-collect-wordstat] Error for ${baseQuery} in ${location.name}:`, error);
        }
      }
    }

    console.log('[seo-collect-wordstat] Collected', collectedKeywords.length, 'keywords');

    // Сохраняем ключевые слова в БД
    if (collectedKeywords.length > 0) {
      // Удаляем дубликаты
      const uniqueKeywords = collectedKeywords.reduce((acc, curr) => {
        const existing = acc.find((k: any) => k.phrase === curr.phrase && k.region === curr.region);
        if (!existing) {
          acc.push(curr);
        }
        return acc;
      }, []);

      const { error: kwError } = await supabase
        .from('kw_norm')
        .upsert(uniqueKeywords, {
          onConflict: 'phrase,region',
          ignoreDuplicates: true,
        });

      if (kwError) {
        console.error('[seo-collect-wordstat] Error saving keywords:', kwError);
      }

      // Создаем кластеры по базовым запросам
      for (const baseQuery of BASE_QUERIES) {
        const clusterKeywords = uniqueKeywords.filter((kw: any) => 
          kw.phrase.toLowerCase().includes(baseQuery.toLowerCase())
        );

        if (clusterKeywords.length > 0) {
          // Создаем кластер
          const { error: clusterError } = await supabase
            .from('kw_clusters')
            .upsert({
              organization_id: organizationId,
              head_term: baseQuery,
              slug: baseQuery.toLowerCase().replace(/\s+/g, '-'),
              members: clusterKeywords.map((k: any) => k.phrase),
              intent: 'informational',
              score: 50,
              status: 'pending',
            }, {
              onConflict: 'organization_id,slug',
            });

          if (clusterError) {
            console.error('[seo-collect-wordstat] Error creating cluster:', clusterError);
          }
        }
      }
    }

    // Логируем задачу
    await supabase.from('seo_job_logs').insert({
      organization_id: organizationId,
      job_type: 'collect_wordstat',
      status: 'success',
      input_data: { locations: SCHOOL_LOCATIONS.length, base_queries: BASE_QUERIES.length },
      output_data: { collected_count: collectedKeywords.length },
    });

    return new Response(JSON.stringify({
      success: true,
      collected: collectedKeywords.length,
      clusters_created: BASE_QUERIES.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[seo-collect-wordstat] Error:', error);

    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
