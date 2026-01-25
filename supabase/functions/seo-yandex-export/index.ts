import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { 
  successResponse, 
  errorResponse, 
  getErrorMessage,
  handleCors 
} from '../_shared/types.ts';

const YANDEX_OAUTH_TOKEN = Deno.env.get('YANDEX_OAUTH_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { organizationId } = await req.json();
    
    // Используем правильный host_id для okeyenglish.ru
    const hostId = 'https:okeyenglish.ru:443';
    
    console.log('[seo-yandex-export] Starting export for host:', hostId);

    if (!organizationId) {
      throw new Error('organizationId is required');
    }

    if (!YANDEX_OAUTH_TOKEN) {
      throw new Error('YANDEX_OAUTH_TOKEN not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Получаем user_id для Яндекс API
    const userIdResponse = await fetch('https://webmaster.yandex.ru/api/v4/user', {
      headers: {
        'Authorization': `OAuth ${YANDEX_OAUTH_TOKEN}`,
      },
    });

    if (!userIdResponse.ok) {
      throw new Error('Failed to get Yandex user ID');
    }

    const userData = await userIdResponse.json();
    const userId = userData.user_id;

    console.log('[seo-yandex-export] Yandex user ID:', userId);

    // Получаем запросы за последние 30 дней
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 30);
    const dateTo = new Date();

    const queriesResponse = await fetch(
      `https://webmaster.yandex.ru/api/v4/user/${userId}/hosts/${hostId}/search-queries/popular`,
      {
        method: 'POST',
        headers: {
          'Authorization': `OAuth ${YANDEX_OAUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date_from: dateFrom.toISOString().split('T')[0],
          date_to: dateTo.toISOString().split('T')[0],
          limit: 500,
        }),
      }
    );

    if (!queriesResponse.ok) {
      const errorText = await queriesResponse.text();
      console.error('[seo-yandex-export] Yandex API error:', errorText);
      throw new Error('Failed to fetch queries from Yandex');
    }

    const queriesData = await queriesResponse.json();
    const queries = queriesData.queries || [];

    console.log('[seo-yandex-export] Received', queries.length, 'queries');

    // Сохраняем запросы в БД
    let imported = 0;
    for (const query of queries) {
      // Нормализуем запрос
      const queryNorm = query.query_text.toLowerCase().trim();

      // Вставляем в kw_norm если еще нет
      const { error: kwError } = await supabase
        .from('kw_norm')
        .upsert({
          organization_id: organizationId,
          query_norm: queryNorm,
          wordstat_freq: query.impressions || 0,
          source: 'yandex_webmaster',
        }, {
          onConflict: 'organization_id,query_norm',
          ignoreDuplicates: true,
        });

      if (!kwError) {
        imported++;
      }
    }

    console.log('[seo-yandex-export] Imported', imported, 'unique queries');

    // Логируем задачу
    await supabase.from('seo_job_logs').insert({
      organization_id: organizationId,
      job_type: 'yandex_export',
      status: 'success',
      input_data: { hostId },
      output_data: { 
        total_queries: queries.length,
        imported: imported
      },
    });

    return successResponse({
      total_queries: queries.length,
      imported,
    });

  } catch (error: unknown) {
    console.error('[seo-yandex-export] Error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});
