import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const YANDEX_DIRECT_TOKEN = Deno.env.get('YANDEX_DIRECT_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organizationId, clusterIds } = await req.json();
    console.log('[seo-enrich-clusters] Starting enrichment for org:', organizationId);

    if (!organizationId) {
      throw new Error('organizationId is required');
    }

    if (!YANDEX_DIRECT_TOKEN) {
      throw new Error('YANDEX_DIRECT_TOKEN not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Получаем кластеры для обогащения
    let query = supabase
      .from('kw_clusters')
      .select('id, head_term, slug')
      .eq('organization_id', organizationId);

    if (clusterIds && clusterIds.length > 0) {
      query = query.in('id', clusterIds);
    }

    const { data: clusters, error: clustersError } = await query;

    if (clustersError) {
      throw clustersError;
    }

    if (!clusters || clusters.length === 0) {
      console.log('[seo-enrich-clusters] No clusters to enrich');
      return new Response(JSON.stringify({
        success: true,
        enriched: 0,
        message: 'No clusters found',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[seo-enrich-clusters] Found', clusters.length, 'clusters to enrich');

    let enrichedCount = 0;
    let errorCount = 0;

    // Обрабатываем кластеры батчами по 10
    for (let i = 0; i < clusters.length; i += 10) {
      const batch = clusters.slice(i, i + 10);
      const keywords = batch.map(c => c.head_term);

      try {
        console.log('[seo-enrich-clusters] Processing batch:', keywords);

        // Вызываем Yandex.Direct API для батча
        const wordstatResponse = await fetch('https://api.direct.yandex.com/json/v5/keywordsresearch', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${YANDEX_DIRECT_TOKEN}`,
            'Content-Type': 'application/json',
            'Accept-Language': 'ru',
          },
          body: JSON.stringify({
            method: 'get',
            params: {
              SelectionCriteria: {
                Keywords: keywords,
              },
              ResultType: 'VOLUME_AND_POSITION',
            }
          }),
        });

        if (!wordstatResponse.ok) {
          const errorText = await wordstatResponse.text();
          console.error('[seo-enrich-clusters] API error:', errorText);
          errorCount += batch.length;
          continue;
        }

        const wordstatData = await wordstatResponse.json();

        // Обрабатываем результаты
        if (wordstatData.result?.SearchVolume) {
          for (const item of wordstatData.result.SearchVolume) {
            const keyword = item.Keyword;
            const searchVolume = item.SearchVolume || 0;
            const competition = item.Competition || 'UNKNOWN';

            // Находим соответствующий кластер
            const cluster = batch.find(c => c.head_term.toLowerCase() === keyword.toLowerCase());
            if (!cluster) continue;

            // Сохраняем данные в kw_norm
            const { error: kwError } = await supabase
              .from('kw_norm')
              .upsert({
                phrase: keyword,
                region: 'all',
                monthly_searches: searchVolume,
                wordstat_competition: competition,
                difficulty: competition === 'HIGH' ? 80 : competition === 'MEDIUM' ? 50 : 30,
                intent: 'informational',
                organization_id: organizationId,
                source: 'wordstat_enrichment',
                last_updated: new Date().toISOString(),
              }, {
                onConflict: 'phrase,region',
              });

            if (kwError) {
              console.error('[seo-enrich-clusters] Error saving keyword:', kwError);
              errorCount++;
              continue;
            }

            // Обновляем score кластера
            const score = Math.min(100, Math.floor((searchVolume / 100) + (competition === 'LOW' ? 20 : competition === 'MEDIUM' ? 10 : 0)));
            
            const { error: clusterError } = await supabase
              .from('kw_clusters')
              .update({
                score: score,
              })
              .eq('id', cluster.id);

            if (clusterError) {
              console.error('[seo-enrich-clusters] Error updating cluster:', clusterError);
              errorCount++;
            } else {
              enrichedCount++;
            }
          }
        }

        // Задержка между батчами
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error('[seo-enrich-clusters] Batch error:', error);
        errorCount += batch.length;
      }
    }

    // Логируем результат
    await supabase.from('seo_job_logs').insert({
      organization_id: organizationId,
      job_type: 'enrich_clusters',
      status: errorCount > 0 ? 'partial_success' : 'success',
      input_data: { total_clusters: clusters.length, cluster_ids: clusterIds },
      output_data: { enriched_count: enrichedCount, error_count: errorCount },
    });

    return new Response(JSON.stringify({
      success: true,
      enriched: enrichedCount,
      errors: errorCount,
      total: clusters.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[seo-enrich-clusters] Error:', error);

    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
