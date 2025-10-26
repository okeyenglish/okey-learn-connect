import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

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
    const { organizationId } = await req.json();

    if (!organizationId) {
      throw new Error('organizationId is required');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Получаем все запросы с Wordstat данными
    const { data: keywords, error: kwError } = await supabase
      .from('kw_norm')
      .select('phrase, monthly_searches, wordstat_competition')
      .eq('organization_id', organizationId)
      .not('monthly_searches', 'is', null)
      .order('monthly_searches', { ascending: false });

    if (kwError) throw kwError;

    if (!keywords || keywords.length === 0) {
      throw new Error('Нет данных Wordstat для кластеризации. Сначала соберите статистику.');
    }

    // Группируем запросы по ключевым словам
    const clusters = new Map<string, {
      head_term: string;
      members: string[];
      totalSearches: number;
      avgCompetition: number;
      competitionCounts: { LOW: number; MEDIUM: number; HIGH: number };
    }>();

    // Простая кластеризация по первым 2-3 словам
    for (const kw of keywords) {
      const words = kw.phrase.toLowerCase().trim().split(/\s+/);
      
      // Пропускаем очень короткие запросы
      if (words.length < 2) continue;

      // Для head_term берем первые 2-3 значимых слова
      const headWords = words.slice(0, Math.min(3, words.length));
      const headTerm = headWords.join(' ');

      if (!clusters.has(headTerm)) {
        clusters.set(headTerm, {
          head_term: headTerm,
          members: [],
          totalSearches: 0,
          avgCompetition: 0,
          competitionCounts: { LOW: 0, MEDIUM: 0, HIGH: 0 },
        });
      }

      const cluster = clusters.get(headTerm)!;
      cluster.members.push(kw.phrase);
      cluster.totalSearches += kw.monthly_searches || 0;
      
      if (kw.wordstat_competition) {
        cluster.competitionCounts[kw.wordstat_competition as 'LOW' | 'MEDIUM' | 'HIGH']++;
      }
    }

    // Фильтруем кластеры: оставляем только с 2+ запросами
    const validClusters = Array.from(clusters.values())
      .filter(c => c.members.length >= 2)
      .sort((a, b) => b.totalSearches - a.totalSearches)
      .slice(0, 50); // Топ-50 кластеров

    // Рассчитываем score для каждого кластера
    const clustersToInsert = validClusters.map(cluster => {
      // Score = средняя частота * вес конкуренции
      const avgSearches = cluster.totalSearches / cluster.members.length;
      const totalMembers = cluster.members.length;
      
      // Определяем доминирующую конкуренцию
      const maxCompetition = Math.max(
        cluster.competitionCounts.LOW,
        cluster.competitionCounts.MEDIUM,
        cluster.competitionCounts.HIGH
      );
      
      let competitionWeight = 1;
      if (cluster.competitionCounts.HIGH === maxCompetition) {
        competitionWeight = 0.6;
      } else if (cluster.competitionCounts.MEDIUM === maxCompetition) {
        competitionWeight = 0.8;
      }

      const score = Math.round(
        (avgSearches * 0.7 + totalMembers * 100 * 0.3) * competitionWeight
      );

      return {
        organization_id: organizationId,
        head_term: cluster.head_term,
        slug: cluster.head_term.toLowerCase().replace(/\s+/g, '-'),
        status: 'active',
        score: score,
        members: cluster.members,
      };
    });

    // Удаляем старые автоматически созданные кластеры
    const { error: deleteError } = await supabase
      .from('kw_clusters')
      .delete()
      .eq('organization_id', organizationId)
      .eq('status', 'active');

    if (deleteError) {
      console.error('Error deleting old clusters:', deleteError);
    }

    // Вставляем новые кластеры
    const { error: insertError } = await supabase
      .from('kw_clusters')
      .insert(clustersToInsert);

    if (insertError) throw insertError;

    // Логируем результат
    await supabase
      .from('seo_job_logs')
      .insert({
        organization_id: organizationId,
        job_type: 'auto_cluster',
        status: 'completed',
        result: {
          clustersCreated: clustersToInsert.length,
          totalKeywords: keywords.length,
          topClusters: clustersToInsert.slice(0, 10).map(c => ({
            head_term: c.head_term,
            score: c.score,
            members: c.members.length,
          })),
        },
      });

    return new Response(JSON.stringify({
      success: true,
      clustersCreated: clustersToInsert.length,
      totalKeywords: keywords.length,
      clusters: clustersToInsert,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[seo-auto-cluster] Error:', error);
    
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
