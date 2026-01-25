import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/typedClient';
import { getCurrentOrganizationId } from '@/lib/organizationHelpers';

export interface KeywordWithStats {
  phrase: string;
  monthly_searches: number | null;
  wordstat_competition: string | null;
  source: string | null;
  last_updated: string | null;
}

export interface ClusterWithKeywords {
  id: string;
  head_term: string;
  slug: string;
  status: string;
  score: number | null;
  keywordsCount: number;
}

export interface PageWithKeywords {
  url: string;
  last_analyzed_at: string | null;
  analysis: any;
  targetKeywords: string[];
  pageTitle?: string;
}

/**
 * Хук для загрузки данных обзора SEO
 */
export function useSeoOverview() {
  // Топ кластеры
  const { data: topClusters, isLoading: isLoadingClusters } = useQuery({
    queryKey: ['seo-overview-clusters'],
    queryFn: async () => {
      const orgId = await getCurrentOrganizationId();
      
      const { data: clusters, error } = await supabase
        .from('kw_clusters')
        .select('*')
        .eq('organization_id', orgId)
        .order('score', { ascending: false })
        .limit(5);

      if (error) throw error;

      // Получаем количество связанных запросов для каждого кластера
      const clustersWithCounts = await Promise.all(
        (clusters || []).map(async (cluster) => {
          const { count } = await supabase
            .from('kw_norm')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', orgId)
            .ilike('phrase', `%${cluster.head_term}%`);

          return {
            ...cluster,
            keywordsCount: count || 0,
          } as ClusterWithKeywords;
        })
      );

      return clustersWithCounts;
    },
  });

  // Все ключевые слова с статистикой
  const { data: keywords, isLoading: isLoadingKeywords } = useQuery({
    queryKey: ['seo-overview-keywords'],
    queryFn: async () => {
      const orgId = await getCurrentOrganizationId();
      
      const { data, error } = await supabase
        .from('kw_norm')
        .select('phrase, monthly_searches, wordstat_competition, source, last_updated')
        .eq('organization_id', orgId)
        .order('monthly_searches', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return (data || []).map((d: any) => ({
        phrase: d.phrase,
        monthly_searches: d.monthly_searches,
        wordstat_competition: d.wordstat_competition,
        source: d.source,
        last_updated: d.last_updated,
      })) as KeywordWithStats[];
    },
  });

  // Страницы с анализом
  const { data: pages, isLoading: isLoadingPages } = useQuery({
    queryKey: ['seo-overview-pages'],
    queryFn: async () => {
      const orgId = await getCurrentOrganizationId();
      
      const { data, error } = await supabase
        .from('seo_pages')
        .select('*')
        .eq('organization_id', orgId)
        .order('last_analyzed_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      return (data || []).map((page: any) => {
        const analysisData = page.analysis as any;
        return {
          url: page.url,
          last_analyzed_at: page.last_analyzed_at,
          analysis: page.analysis,
          targetKeywords: analysisData?.target_keywords || [],
          pageTitle: analysisData?.title || null,
        };
      }) as PageWithKeywords[];
    },
  });

  // Статистика из GSC
  const { data: gscStats } = useQuery({
    queryKey: ['seo-overview-gsc'],
    queryFn: async () => {
      const orgId = await getCurrentOrganizationId();
      
      const { data, error } = await supabase
        .from('search_console_queries')
        .select('position, clicks, impressions, query')
        .eq('organization_id', orgId);

      if (error) throw error;

      const avgPosition = data.length > 0
        ? data.reduce((sum: number, q: any) => sum + (q.position || 0), 0) / data.length
        : 0;

      const top10 = data.filter((q: any) => q.position && q.position <= 10).length;
      const top20 = data.filter((q: any) => q.position && q.position <= 20).length;
      const totalClicks = data.reduce((sum: number, q: any) => sum + (q.clicks || 0), 0);

      return {
        avgPosition: Math.round(avgPosition * 10) / 10,
        top10Count: top10,
        top20Count: top20,
        totalClicks,
        totalQueries: data.length,
      };
    },
  });

  // Общая статистика
  const { data: stats } = useQuery({
    queryKey: ['seo-overview-stats'],
    queryFn: async () => {
      const orgId = await getCurrentOrganizationId();
      
      const [clustersCount, ideasCount, docsCount, keywordsCount] = await Promise.all([
        supabase.from('kw_clusters').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('content_ideas').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('content_docs').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('kw_norm').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
      ]);

      return {
        clustersCount: clustersCount.count || 0,
        ideasCount: ideasCount.count || 0,
        docsCount: docsCount.count || 0,
        keywordsCount: keywordsCount.count || 0,
      };
    },
  });

  return {
    topClusters,
    keywords,
    pages,
    gscStats,
    stats,
    isLoading: isLoadingClusters || isLoadingKeywords || isLoadingPages,
  };
}
