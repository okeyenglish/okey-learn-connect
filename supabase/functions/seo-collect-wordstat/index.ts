import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { 
  corsHeaders, 
  successResponse, 
  getErrorMessage,
  handleCors 
} from '../_shared/types.ts';

const YANDEX_DIRECT_TOKEN = Deno.env.get('YANDEX_DIRECT_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Локации школ O'KEY ENGLISH (из branches)
const SCHOOL_LOCATIONS = [
  { name: 'Котельники', region_id: 213 }, // Москва
  { name: 'Новокосино', region_id: 213 }, // Москва (Реутов)
  { name: 'Окская', region_id: 213 }, // Москва
  { name: 'Стахановская', region_id: 213 }, // Москва
  { name: 'Солнцево', region_id: 213 }, // Москва
  { name: 'Мытищи', region_id: 1 }, // Московская область
  { name: 'Люберцы', region_id: 1 }, // Московская область
  { name: 'Красная горка', region_id: 1 }, // Московская область (Люберцы)
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

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { organizationId } = await req.json();
    console.log('[seo-collect-wordstat] Starting collection for org:', organizationId);

    if (!organizationId) {
      throw new Error('organizationId is required');
    }

    if (!YANDEX_DIRECT_TOKEN) {
      return new Response(JSON.stringify({
        success: false,
        code: 'MISSING_YANDEX_DIRECT_TOKEN',
        message: 'Не настроен секрет YANDEX_DIRECT_TOKEN. Добавьте токен Яндекс.Директ в Supabase → Settings → Functions Secrets и повторите попытку.'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const collectedKeywords: any[] = [];
const errors: any[] = [];
let accessDenied = false;
    // Собираем данные по каждой локации и базовому запросу
    for (const location of SCHOOL_LOCATIONS) {
      for (const baseQuery of BASE_QUERIES) {
        try {
          console.log(`[seo-collect-wordstat] Collecting: ${baseQuery} in ${location.name}`);

          // Формируем полный запрос с локацией
          const fullQuery = `${baseQuery} ${location.name}`;

          // Вызываем Yandex.Direct Wordstat API
          const wordstatResponse = await fetch('https://api-sandbox.direct.yandex.ru/v4/json/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              method: 'KeywordsResearch',
              token: YANDEX_DIRECT_TOKEN,
              param: {
                Phrases: [fullQuery],
                GeoID: [location.region_id],
              }
            }),
          });

          if (!wordstatResponse.ok) {
            const errorText = await wordstatResponse.text();
            console.error('[seo-collect-wordstat] Wordstat API error:', errorText);
            continue;
          }

const wordstatData = await wordstatResponse.json();
console.log('[seo-collect-wordstat] API Response:', JSON.stringify(wordstatData).substring(0, 500));

// Обработка ошибок API Wordstat
if (wordstatData.error_code) {
  console.error('[seo-collect-wordstat] Wordstat error object:', wordstatData);
  errors.push(wordstatData);
  if (wordstatData.error_code === 58) {
    accessDenied = true; // Нет доступа к API: требуется одобрение приложения
  }
  continue; // Переходим к следующему запросу
}
          
// Парсим результаты
if (wordstatData.data) {
  for (const item of wordstatData.data) {
    const keyword = item.Phrase || item.phrase || fullQuery;
    const searchVolume = item.SearchVolume || item.Shows || 0;
    
    // Определяем конкуренцию на основе частоты
    let competition = 'LOW';
    if (searchVolume > 10000) competition = 'HIGH';
    else if (searchVolume > 1000) competition = 'MEDIUM';

    if (searchVolume > 10) {
      collectedKeywords.push({
        phrase: keyword,
        region: location.name,
        monthly_searches: searchVolume,
        wordstat_competition: competition,
        difficulty: competition === 'HIGH' ? 80 : competition === 'MEDIUM' ? 50 : 30,
        intent: 'informational',
        organization_id: organizationId,
        source: 'wordstat_auto',
        last_updated: new Date().toISOString(),
      });
    }
  }
} else {
  console.warn('[seo-collect-wordstat] Unexpected API payload, no data field');
}


          // Задержка между запросами (500мс)
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`[seo-collect-wordstat] Error for ${baseQuery} in ${location.name}:`, error);
        }
      }
    }

console.log('[seo-collect-wordstat] Collected', collectedKeywords.length, 'keywords');

// Если нет доступа к API и ничего не собрано — логируем и возвращаем понятную ошибку
if (collectedKeywords.length === 0 && accessDenied) {
  await supabase.from('seo_job_logs').insert({
    organization_id: organizationId,
    job_type: 'collect_wordstat',
    status: 'error',
    input_data: { locations: SCHOOL_LOCATIONS.length, base_queries: BASE_QUERIES.length },
    output_data: { collected_count: 0, reason: 'yandex_direct_access_denied', errors_count: errors.length },
  });

  return new Response(JSON.stringify({
    success: false,
    code: 'YANDEX_DIRECT_ACCESS_REQUIRED',
    message: 'Яндекс.Директ вернул ошибку доступа (код 58). Нужно подать заявку на доступ к API в интерфейсе Direct и дождаться подтверждения.',
    collected: 0,
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

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

      // Вставляем ключевые слова по одному (избегаем конфликтов)
      for (const keyword of uniqueKeywords) {
        const { error: kwError } = await supabase
          .from('kw_norm')
          .upsert(keyword, {
            onConflict: 'phrase',
            ignoreDuplicates: false,
          });

        if (kwError) {
          console.error('[seo-collect-wordstat] Error saving keyword:', keyword.phrase, kwError);
        }
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

    return successResponse({
      collected: collectedKeywords.length,
      clusters_created: BASE_QUERIES.length,
    });

  } catch (error: unknown) {
    console.error('[seo-collect-wordstat] Error:', error);

    return new Response(JSON.stringify({
      success: false,
      code: 'UNEXPECTED_ERROR',
      message: getErrorMessage(error),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
